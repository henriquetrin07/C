import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

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

const DATA_DIR = path.join(process.cwd(), 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const PROJECTS_FILE = path.join(DATA_DIR, 'projects.json');

// In-memory cache with file persistence
let usersCache: StoredUser[] = [];
let projectsCache: StoredProject[] = [];
let isInitialized = false;

async function ensureDataDir() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch {}
}

export async function initDatabase() {
  if (isInitialized) return;
  await ensureDataDir();

  try {
    const usersData = await fs.readFile(USERS_FILE, 'utf8');
    usersCache = JSON.parse(usersData);
  } catch {
    usersCache = [];
    await fs.writeFile(USERS_FILE, JSON.stringify(usersCache, null, 2), 'utf8').catch(() => {});
  }

  try {
    const projectsData = await fs.readFile(PROJECTS_FILE, 'utf8');
    projectsCache = JSON.parse(projectsData);
  } catch {
    projectsCache = [];
    await fs.writeFile(PROJECTS_FILE, JSON.stringify(projectsCache, null, 2), 'utf8').catch(() => {});
  }

  isInitialized = true;
}

async function saveUsers() {
  await ensureDataDir();
  try {
    await fs.writeFile(USERS_FILE, JSON.stringify(usersCache, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to persist users:', err);
  }
}

async function saveProjects() {
  await ensureDataDir();
  try {
    await fs.writeFile(PROJECTS_FILE, JSON.stringify(projectsCache, null, 2), 'utf8');
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
  const test = crypto.scryptSync(password, salt, 32).toString('hex');
  return test === hash;
}

// Tokens - Simple secure signed hex string
const SECRET = 'c_ide_edu_secret_' + (process.env.APP_SECRET || '2026_c_compiler');

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

    // Check if user still exists in memory
    const user = usersCache.find((u) => u.id === userId);
    if (!user) return null;
    return { userId, username };
  } catch {
    return null;
  }
}

// User CRUD
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
    // Bem-vindo ao C Web IDE Educacional!
    printf("Olá, mundo! Comecei a programar em C.\\n");
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

// Projects CRUD
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
    files: data.files && data.files.length > 0 ? data.files : [
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
