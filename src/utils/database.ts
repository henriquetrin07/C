import { User, UserProject, SourceFile, CompilerOptions } from '../types';
import { db } from '../firebase';
import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
} from 'firebase/firestore';

const TOKEN_KEY = 'c_ide_auth_token';
const USER_KEY = 'c_ide_current_user';
const LOCAL_USERS_KEY = 'c_compiler_db_users_v2';
const LOCAL_PROJECTS_KEY = 'c_compiler_db_projects_v2';

interface LocalUserRecord {
  id: string;
  username: string;
  passwordHash: string;
  salt: string;
  createdAt: string;
}

// Cryptographic helpers for password hashing using Web Crypto API
async function hashPasswordWithSalt(password: string, salt: string): Promise<string> {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password + '::' + salt);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  let hash = 0;
  const str = password + salt;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(16);
}

function generateSalt(): string {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const array = new Uint8Array(16);
    crypto.getRandomValues(array);
    return Array.from(array)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  return Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
}

// Local cache helpers
function getLocalUsers(): LocalUserRecord[] {
  try {
    const raw = localStorage.getItem(LOCAL_USERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalUsers(users: LocalUserRecord[]) {
  try {
    localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));
  } catch (e) {
    console.error('Failed to save local users cache:', e);
  }
}

function getLocalProjects(): UserProject[] {
  try {
    const raw = localStorage.getItem(LOCAL_PROJECTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalProjects(projects: UserProject[]) {
  try {
    localStorage.setItem(LOCAL_PROJECTS_KEY, JSON.stringify(projects));
  } catch (e) {
    console.error('Failed to save local projects cache:', e);
  }
}

export const DatabaseClient = {
  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  },

  setSession(user: User, token: string) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },

  clearSession() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },

  getCachedUser(): User | null {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  // Register user into both Shared Server Database and Firebase Firestore
  async register(
    username: string,
    password: string
  ): Promise<{ success: boolean; user: User; token: string; error?: string }> {
    const cleanUsername = username.trim();
    if (cleanUsername.length < 3) {
      return {
        success: false,
        user: null as any,
        token: '',
        error: 'O nome de usuário deve ter pelo menos 3 caracteres.',
      };
    }
    if (password.length < 4) {
      return {
        success: false,
        user: null as any,
        token: '',
        error: 'A senha deve ter pelo menos 4 caracteres.',
      };
    }

    const usernameLower = cleanUsername.toLowerCase();
    const salt = generateSalt();
    const passwordHash = await hashPasswordWithSalt(password, salt);
    const createdAt = new Date().toISOString();

    let serverUser: User | null = null;
    let serverToken: string = '';

    // 1. Attempt to register with shared server backend
    try {
      const sRes = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: cleanUsername, password }),
      });

      if (sRes.ok) {
        const sData = await sRes.json();
        if (sData.success) {
          serverUser = sData.user;
          serverToken = sData.token;
        }
      } else if (sRes.status === 409) {
        return {
          success: false,
          user: null as any,
          token: '',
          error: 'Este nome de usuário já está cadastrado. Entre com sua senha ou escolha outro nome.',
        };
      }
    } catch (sErr) {
      console.warn('Server register request notice:', sErr);
    }

    const userId = serverUser?.id || 'u_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const user: User = {
      id: userId,
      username: cleanUsername,
      createdAt,
    };
    const token = serverToken || `fb_tok_${userId}_${Date.now()}`;

    // 2. Save user to Firebase Firestore
    try {
      const userDocRef = doc(db, 'users', usernameLower);
      const userSnap = await getDoc(userDocRef);
      if (userSnap.exists() && !serverUser) {
        return {
          success: false,
          user: null as any,
          token: '',
          error: 'Este nome de usuário já está cadastrado. Entre com sua senha ou escolha outro nome.',
        };
      }

      await setDoc(userDocRef, {
        id: userId,
        username: cleanUsername,
        usernameLower,
        passwordHash,
        salt,
        createdAt,
      });

      // 3. Create initial welcome project
      const initialProjectId = 'p_' + Date.now() + '_welcome';
      const initialProject: UserProject = {
        id: initialProjectId,
        userId: user.id,
        title: 'Meu Primeiro Projeto C',
        name: 'Meu Primeiro Projeto C',
        description: 'Projeto inicial com Olá Mundo e noções básicas de C',
        files: [
          {
            id: 'f_main',
            name: 'main.c',
            content: `#include <stdio.h>

int main() {
    // Bem-vindo ao C Web IDE & Compilador Online!
    printf("Olá, %s! Sua conta e códigos estão salvos na nuvem.\\n", "${cleanUsername}");
    printf("Qualquer pessoa de qualquer computador agora pode acessar.\\n");
    return 0;
}
`,
            isMain: true,
          },
        ],
        stdin: '',
        createdAt,
        updatedAt: createdAt,
      };

      await setDoc(doc(db, 'projects', initialProjectId), {
        ...initialProject,
        username: cleanUsername,
      }).catch(() => {});

      // Mirror to local cache
      const localProjects = getLocalProjects();
      localProjects.unshift(initialProject);
      saveLocalProjects(localProjects);
    } catch (fbErr) {
      console.warn('Firestore register notice:', fbErr);
    }

    // Mirror to local cache
    const localUsers = getLocalUsers();
    if (!localUsers.some((u) => u.username.toLowerCase() === usernameLower)) {
      localUsers.push({ id: userId, username: cleanUsername, passwordHash, salt, createdAt });
      saveLocalUsers(localUsers);
    }

    this.setSession(user, token);
    return { success: true, user, token };
  },

  // Login user: checks both Shared Server Database and Firebase Firestore
  async login(
    username: string,
    password: string
  ): Promise<{ success: boolean; user: User; token: string; error?: string }> {
    const cleanUsername = username.trim();
    if (!cleanUsername || !password) {
      return {
        success: false,
        user: null as any,
        token: '',
        error: 'Informe usuário e senha para entrar.',
      };
    }

    const usernameLower = cleanUsername.toLowerCase();

    // 1. Try Shared Server Database first (accessible from all devices)
    try {
      const serverRes = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: cleanUsername, password }),
      });

      if (serverRes.ok) {
        const data = await serverRes.json();
        if (data.success && data.user && data.token) {
          this.setSession(data.user, data.token);

          // Sync user record to Firestore asynchronously
          (async () => {
            try {
              const userDocRef = doc(db, 'users', usernameLower);
              const snap = await getDoc(userDocRef);
              if (!snap.exists()) {
                const salt = generateSalt();
                const passwordHash = await hashPasswordWithSalt(password, salt);
                await setDoc(userDocRef, {
                  id: data.user.id,
                  username: data.user.username,
                  usernameLower,
                  passwordHash,
                  salt,
                  createdAt: data.user.createdAt,
                });
              }
            } catch {}
          })();

          return { success: true, user: data.user, token: data.token };
        }
      } else if (serverRes.status === 401) {
        const errData = await serverRes.json().catch(() => ({}));
        if (errData.error && errData.error.includes('incorret')) {
          // If server verified that user exists and password was wrong, return immediately
        }
      }
    } catch (sErr) {
      console.warn('Server login request failed, checking Firestore:', sErr);
    }

    // 2. Check Firebase Firestore Cloud Database
    try {
      const userDocRef = doc(db, 'users', usernameLower);
      const userSnap = await getDoc(userDocRef);

      if (userSnap.exists()) {
        const data = userSnap.data();
        const expectedHash = data.passwordHash;
        const salt = data.salt;

        const calculatedHash = await hashPasswordWithSalt(password, salt);

        if (calculatedHash === expectedHash) {
          const user: User = {
            id: data.id,
            username: data.username || cleanUsername,
            createdAt: data.createdAt,
          };
          const token = `fb_tok_${user.id}_${Date.now()}`;
          this.setSession(user, token);

          // Register this user on the server if not already there
          fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: cleanUsername, password }),
          }).catch(() => {});

          return { success: true, user, token };
        } else {
          return {
            success: false,
            user: null as any,
            token: '',
            error: 'Senha incorreta. Verifique os caracteres e tente novamente.',
          };
        }
      }
    } catch (firestoreErr) {
      console.warn('Firestore lookup notice:', firestoreErr);
    }

    // 3. Fallback check in local users cache
    const localUsers = getLocalUsers();
    const localMatch = localUsers.find((u) => u.username.toLowerCase() === usernameLower);

    if (localMatch) {
      const calculatedHash = await hashPasswordWithSalt(password, localMatch.salt);
      if (calculatedHash === localMatch.passwordHash) {
        const user: User = {
          id: localMatch.id,
          username: localMatch.username,
          createdAt: localMatch.createdAt,
        };
        const token = `loc_tok_${user.id}_${Date.now()}`;
        this.setSession(user, token);

        // Sync to server and Firestore in background
        fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username: cleanUsername, password }),
        }).catch(() => {});

        return { success: true, user, token };
      }
      return {
        success: false,
        user: null as any,
        token: '',
        error: 'Senha incorreta. Verifique os caracteres e tente novamente.',
      };
    }

    return {
      success: false,
      user: null as any,
      token: '',
      error: 'Usuário não encontrado. Verifique o nome digitado ou crie uma conta.',
    };
  },

  // Get current active session user
  async getCurrentUser(): Promise<User | null> {
    const token = this.getToken();
    if (!token) return null;

    const cached = this.getCachedUser();
    if (cached) return cached;

    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.user) {
          localStorage.setItem(USER_KEY, JSON.stringify(data.user));
          return data.user;
        }
      }
    } catch {
      // Ignore
    }

    return null;
  },

  // Get all projects for a user from Firestore + Server API + local cache
  async getProjects(userId: string): Promise<UserProject[]> {
    const projectMap = new Map<string, UserProject>();

    // 1. Get projects from Firestore Cloud Database
    try {
      const q = query(collection(db, 'projects'), where('userId', '==', userId));
      const querySnapshot = await getDocs(q);
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data() as UserProject;
        projectMap.set(data.id || docSnap.id, {
          ...data,
          id: data.id || docSnap.id,
        });
      });
    } catch (err) {
      console.warn('Firestore getProjects warning:', err);
    }

    // 2. Get projects from Server API
    const token = this.getToken();
    if (token) {
      try {
        const sRes = await fetch('/api/projects', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (sRes.ok) {
          const sData = await sRes.json();
          if (sData.success && Array.isArray(sData.projects)) {
            for (const sp of sData.projects) {
              if (!projectMap.has(sp.id)) {
                projectMap.set(sp.id, {
                  ...sp,
                  name: sp.name || sp.title,
                });
              }
            }
          }
        }
      } catch (err) {
        console.warn('Server getProjects warning:', err);
      }
    }

    // 3. Also merge from local cache
    const localProjects = getLocalProjects().filter((p) => p.userId === userId);
    for (const lp of localProjects) {
      if (!projectMap.has(lp.id)) {
        projectMap.set(lp.id, lp);
      }
    }

    const merged = Array.from(projectMap.values()).sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );

    saveLocalProjects(merged);
    return merged;
  },

  // Save or update a project in Firestore Cloud Database & Server
  async saveProject(
    userId: string,
    data: {
      id?: string;
      title: string;
      description?: string;
      files: SourceFile[];
      stdin?: string;
      compilerOptions?: CompilerOptions;
    }
  ): Promise<{ success: boolean; project: UserProject; error?: string }> {
    const projectId =
      data.id || 'p_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
    const now = new Date().toISOString();
    const title = data.title.trim() || 'Projeto sem título';

    const project: UserProject = {
      id: projectId,
      userId,
      title,
      name: title,
      description: data.description || '',
      files: data.files,
      stdin: data.stdin || '',
      compilerOptions: data.compilerOptions,
      updatedAt: now,
      createdAt: now,
    };

    // 1. Save to Firestore Cloud Database
    try {
      await setDoc(doc(db, 'projects', projectId), {
        ...project,
      });
    } catch (err) {
      console.warn('Firestore project save warning:', err);
    }

    // 2. Save to Server API
    const token = this.getToken();
    if (token) {
      fetch('/api/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(project),
      }).catch(() => {});
    }

    // 3. Save to local cache
    const local = getLocalProjects();
    const existingIdx = local.findIndex((p) => p.id === projectId);
    if (existingIdx >= 0) {
      local[existingIdx] = {
        ...local[existingIdx],
        ...project,
        createdAt: local[existingIdx].createdAt || now,
      };
    } else {
      local.unshift(project);
    }
    saveLocalProjects(local);

    return { success: true, project };
  },

  // Delete project from Firestore Cloud Database & Server
  async deleteProject(userId: string, projectId: string): Promise<boolean> {
    try {
      await deleteDoc(doc(db, 'projects', projectId));
    } catch (err) {
      console.warn('Firestore project delete warning:', err);
    }

    const token = this.getToken();
    if (token) {
      fetch(`/api/projects/${projectId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }

    const local = getLocalProjects().filter(
      (p) => !(p.id === projectId && p.userId === userId)
    );
    saveLocalProjects(local);
    return true;
  },

  exportProjectsBackup(userId: string): string {
    const projects = getLocalProjects().filter((p) => p.userId === userId);
    return JSON.stringify(
      {
        version: '2.0',
        exportedAt: new Date().toISOString(),
        userId,
        projects,
      },
      null,
      2
    );
  },

  importProjectsBackup(userId: string, jsonString: string): number {
    try {
      const data = JSON.parse(jsonString);
      const incoming = Array.isArray(data) ? data : data.projects;
      if (!Array.isArray(incoming)) return 0;

      const localProjects = getLocalProjects();
      let importedCount = 0;

      for (const item of incoming) {
        if (!item.title || !Array.isArray(item.files)) continue;

        const newProj: UserProject = {
          id: 'imported_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
          userId,
          title: item.title || item.name || 'Projeto Importado',
          name: item.title || item.name || 'Projeto Importado',
          description: item.description || 'Importado via backup',
          files: item.files,
          stdin: item.stdin || '',
          compilerOptions: item.compilerOptions,
          createdAt: item.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        setDoc(doc(db, 'projects', newProj.id), newProj).catch(() => {});

        localProjects.unshift(newProj);
        importedCount++;
      }

      saveLocalProjects(localProjects);
      return importedCount;
    } catch {
      return 0;
    }
  },
};
