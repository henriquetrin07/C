import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import os from 'os';

export interface StoredUser {
  id: string;
  username: string;
  passwordHash: string;
  salt: string;
  createdAt: string;
}

export interface StoredProject {
  id: string;
  userId: string;
  title: string;
  description?: string;
  files: Array<{ id: string; name: string; content: string; isMain?: boolean }>;
  stdin?: string;
  compilerOptions?: any;
  updatedAt: string;
  createdAt: string;
}

const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);

function resolveDataDir(): string {
  if (process.env.DATA_DIR) {
    return process.env.DATA_DIR;
  }
  if (isServerless) {
    return path.join(os.tmpdir(), 'c_compiler_database');
  }
  return path.join(process.cwd(), 'data');
}

let DATA_DIR = resolveDataDir();
let USERS_FILE = path.join(DATA_DIR, 'users.json');
let PROJECTS_FILE = path.join(DATA_DIR, 'projects.json');

// In-memory cache with file persistence
let usersCache: StoredUser[] = [];
let projectsCache: StoredProject[] = [];
let isInitialized = false;

async function ensureDataDir() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch (err: any) {
    if (err.code === 'EROFS' || err.code === 'EACCES') {
      DATA_DIR = path.join(os.tmpdir(), 'c_compiler_database');
      USERS_FILE = path.join(DATA_DIR, 'users.json');
      PROJECTS_FILE = path.join(DATA_DIR, 'projects.json');
      await fs.mkdir(DATA_DIR, { recursive: true }).catch(() => {});
    }
  }
}

async function atomicWriteFile(filePath: string, content: string) {
  const tmpPath = `${filePath}.${Date.now()}.${Math.random().toString(36).substring(2, 7)}.tmp`;
  try {
    await fs.writeFile(tmpPath, content, 'utf8');
    await fs.rename(tmpPath, filePath);
  } catch {
    await fs.writeFile(filePath, content, 'utf8').catch(() => {});
  }
}

export async function initDatabase() {
  if (isInitialized) return;
  await ensureDataDir();

  try {
    const usersData = await fs.readFile(USERS_FILE, 'utf8');
    usersCache = JSON.parse(usersData);
  } catch {
    usersCache = [];
    await atomicWriteFile(USERS_FILE, JSON.stringify(usersCache, null, 2)).catch(() => {});
  }

  try {
    const projectsData = await fs.readFile(PROJECTS_FILE, 'utf8');
    projectsCache = JSON.parse(projectsData);
  } catch {
    projectsCache = [];
    await atomicWriteFile(PROJECTS_FILE, JSON.stringify(projectsCache, null, 2)).catch(() => {});
  }

  isInitialized = true;
}

async function saveUsers() {
  await ensureDataDir();
  try {
    await atomicWriteFile(USERS_FILE, JSON.stringify(usersCache, null, 2));
  } catch (err) {
    console.error('Failed to persist users:', err);
  }
}

async function saveProjects() {
  await ensureDataDir();
  try {
    await atomicWriteFile(PROJECTS_FILE, JSON.stringify(projectsCache, null, 2));
  } catch (err) {
    console.error('Failed to persist projects:', err);
  }
}

// Password hashing using scrypt
export function hashPassword(password: string, salt?: string): { hash: string; salt: string } {
  const userSalt = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, userSalt, 32).toString('hex');
  return { hash, salt: userSalt };
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  try {
    const test = crypto.scryptSync(password, salt, 32).toString('hex');
    return test === hash;
  } catch {
    return false;
  }
}

// Tokens - Secure HMAC signed base64 string
const SECRET = 'c_ide_edu_secret_' + (process.env.APP_SECRET || '2026_c_compiler_secure_token');

export function generateToken(user: StoredUser): string {
  const payload = `${user.id}:${user.username}:${Date.now()}`;
  const sig = crypto.createHmac('sha256', SECRET).update(payload).digest('hex');
  return Buffer.from(`${payload}:${sig}`).toString('base64');
}

export function verifyToken(token: string): { userId: string; username: string } | null {
  try {
    const raw = Buffer.from(token, 'base64').toString('utf8');
    const parts = raw.split(':');
    if (parts.length !== 4) return null;
    const [userId, username, timestamp, sig] = parts;
    const payload = `${userId}:${username}:${timestamp}`;
    const expectedSig = crypto.createHmac('sha256', SECRET).update(payload).digest('hex');
    if (expectedSig !== sig) return null;

    // Check expiration (30 days)
    const tokenTime = parseInt(timestamp, 10);
    if (isNaN(tokenTime) || Date.now() - tokenTime > 30 * 24 * 60 * 60 * 1000) {
      return null;
    }

    return { userId, username };
  } catch {
    return null;
  }
}

// User Operations
export async function findUserByUsername(username: string): Promise<StoredUser | undefined> {
  await initDatabase();
  const normalized = username.trim().toLowerCase();
  return usersCache.find((u) => u.username.toLowerCase() === normalized);
}

export async function findUserById(id: string): Promise<StoredUser | undefined> {
  await initDatabase();
  return usersCache.find((u) => u.id === id);
}

export async function createUser(username: string, password: string): Promise<StoredUser> {
  await initDatabase();
  const cleanUsername = username.trim();
  const { hash, salt } = hashPassword(password);
  const newUser: StoredUser = {
    id: 'u_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    username: cleanUsername,
    passwordHash: hash,
    salt,
    createdAt: new Date().toISOString(),
  };

  usersCache.push(newUser);
  await saveUsers();

  // Create initial starter project for this user
  const initialProject: StoredProject = {
    id: 'p_' + Date.now() + '_init',
    userId: newUser.id,
    title: 'Meu Primeiro Projeto C',
    description: 'Projeto inicial de boas-vindas com Olá Mundo e noções básicas',
    files: [
      {
        id: 'f_main',
        name: 'main.c',
        content: `#include <stdio.h>

int main() {
    // Bem-vindo ao C Web IDE & Compilador Online!
    printf("Olá, mundo! Minha conta e projetos estão salvos.\\n");
    printf("Explore a trilha 'Aprenda C do Zero' para ver as lições.\\n");
    return 0;
}
`,
        isMain: true,
      },
    ],
    stdin: '',
    updatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };

  projectsCache.push(initialProject);
  await saveProjects();

  return newUser;
}

// Projects Operations
export async function getUserProjects(userId: string): Promise<StoredProject[]> {
  await initDatabase();
  return projectsCache
    .filter((p) => p.userId === userId)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export async function getProjectById(projectId: string, userId: string): Promise<StoredProject | undefined> {
  await initDatabase();
  return projectsCache.find((p) => p.id === projectId && p.userId === userId);
}

export async function createProject(
  userId: string,
  data: {
    title: string;
    description?: string;
    files: Array<{ id: string; name: string; content: string; isMain?: boolean }>;
    stdin?: string;
    compilerOptions?: any;
  }
): Promise<StoredProject> {
  await initDatabase();
  const newProject: StoredProject = {
    id: 'p_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
    userId,
    title: data.title || 'Projeto sem título',
    description: data.description || '',
    files:
      data.files && data.files.length > 0
        ? data.files
        : [
            {
              id: 'f_main',
              name: 'main.c',
              content: '#include <stdio.h>\n\nint main() {\n    printf("Novo programa em C\\n");\n    return 0;\n}\n',
              isMain: true,
            },
          ],
    stdin: data.stdin || '',
    compilerOptions: data.compilerOptions,
    updatedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };

  projectsCache.push(newProject);
  await saveProjects();
  return newProject;
}

export async function updateProject(
  projectId: string,
  userId: string,
  data: {
    title?: string;
    description?: string;
    files?: Array<{ id: string; name: string; content: string; isMain?: boolean }>;
    stdin?: string;
    compilerOptions?: any;
  }
): Promise<StoredProject | null> {
  await initDatabase();
  const index = projectsCache.findIndex((p) => p.id === projectId && p.userId === userId);
  if (index === -1) return null;

  const current = projectsCache[index];
  const updated: StoredProject = {
    ...current,
    title: data.title !== undefined ? data.title : current.title,
    description: data.description !== undefined ? data.description : current.description,
    files: data.files !== undefined ? data.files : current.files,
    stdin: data.stdin !== undefined ? data.stdin : current.stdin,
    compilerOptions: data.compilerOptions !== undefined ? data.compilerOptions : current.compilerOptions,
    updatedAt: new Date().toISOString(),
  };

  projectsCache[index] = updated;
  await saveProjects();
  return updated;
}

export async function deleteProject(projectId: string, userId: string): Promise<boolean> {
  await initDatabase();
  const initialLength = projectsCache.length;
  projectsCache = projectsCache.filter((p) => !(p.id === projectId && p.userId === userId));
  if (projectsCache.length !== initialLength) {
    await saveProjects();
    return true;
  }
  return false;
}
