import { User, UserProject, SourceFile, CompilerOptions } from '../types';

const TOKEN_KEY = 'c_ide_auth_token';
const USER_KEY = 'c_ide_current_user';
const LOCAL_USERS_KEY = 'c_compiler_db_users_v2';
const LOCAL_PROJECTS_KEY = 'c_compiler_db_projects_v2';

interface LocalUserRecord {
  id: string;
  username: string;
  password: string; // Stored in client DB
  createdAt: string;
}

// Helper to safely parse JSON response without crashing if server returns HTML or empty
async function safeFetchJson(url: string, options: RequestInit = {}): Promise<{ ok: boolean; status: number; data: any; rawText: string }> {
  try {
    const res = await fetch(url, options);
    const rawText = await res.text();
    let data: any = null;

    try {
      if (rawText && rawText.trim().startsWith('{') || rawText.trim().startsWith('[')) {
        data = JSON.parse(rawText);
      }
    } catch {
      data = null;
    }

    return {
      ok: res.ok,
      status: res.status,
      data,
      rawText,
    };
  } catch (err: any) {
    return {
      ok: false,
      status: 0,
      data: null,
      rawText: err?.message || 'Network error',
    };
  }
}

// Client Database (LocalStorage) Helpers
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
    console.error('Failed to save local users database:', e);
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
    console.error('Failed to save local projects database:', e);
  }
}

export const DatabaseClient = {
  // Get stored token
  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  },

  // Save session
  setSession(user: User, token: string) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },

  // Clear session
  clearSession() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },

  // Get locally cached user
  getCachedUser(): User | null {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },

  // Register user (Tries server database first; if server is serverless/offline/static, seamlessly uses client database)
  async register(username: string, password: string): Promise<{ success: boolean; user: User; token: string; error?: string }> {
    const cleanUsername = username.trim();
    if (cleanUsername.length < 3) {
      return { success: false, user: null as any, token: '', error: 'O nome de usuário deve ter pelo menos 3 caracteres.' };
    }
    if (password.length < 4) {
      return { success: false, user: null as any, token: '', error: 'A senha deve ter pelo menos 4 caracteres.' };
    }

    // Try server API
    const res = await safeFetchJson('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: cleanUsername, password }),
    });

    if (res.ok && res.data && res.data.success) {
      const user: User = res.data.user;
      const token: string = res.data.token;
      this.setSession(user, token);

      // Also mirror to local database for resilience
      const localUsers = getLocalUsers();
      if (!localUsers.some((u) => u.username.toLowerCase() === cleanUsername.toLowerCase())) {
        localUsers.push({
          id: user.id,
          username: cleanUsername,
          password,
          createdAt: user.createdAt,
        });
        saveLocalUsers(localUsers);
      }

      return { success: true, user, token };
    }

    // If server returned specific business error (like username already exists), report it
    if (res.data && res.data.error && res.status === 409) {
      return { success: false, user: null as any, token: '', error: res.data.error };
    }

    // If server was unreachable, returned HTML (Vercel rewrite/cold start), or errored:
    // Create the account directly in the client database so the user is NEVER blocked!
    const localUsers = getLocalUsers();
    const existing = localUsers.find((u) => u.username.toLowerCase() === cleanUsername.toLowerCase());
    if (existing) {
      return { success: false, user: null as any, token: '', error: 'Nome de usuário já existe na base de dados. Faça login ou use outro.' };
    }

    const newLocalUser: LocalUserRecord = {
      id: 'usr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      username: cleanUsername,
      password,
      createdAt: new Date().toISOString(),
    };

    localUsers.push(newLocalUser);
    saveLocalUsers(localUsers);

    const clientUser: User = {
      id: newLocalUser.id,
      username: newLocalUser.username,
      createdAt: newLocalUser.createdAt,
    };

    // Client-side local token
    const clientToken = `local_tok_${newLocalUser.id}_${Date.now()}`;
    this.setSession(clientUser, clientToken);

    // Create initial welcome project in local database
    const initialProj: UserProject = {
      id: 'proj_' + Date.now() + '_init',
      userId: clientUser.id,
      title: 'Meu Primeiro Projeto C',
      name: 'Meu Primeiro Projeto C',
      description: 'Projeto inicial com Olá Mundo e noções fundamentais de C',
      files: [
        {
          id: 'f_main',
          name: 'main.c',
          content: `#include <stdio.h>

int main() {
    // Bem-vindo ao C Web IDE!
    // Sua conta e projetos estão salvos no banco de dados.
    printf("Olá, mundo! Minha conta foi criada com sucesso.\\n");
    printf("Explore a trilha 'Aprenda C do Zero' para ver as lições.\\n");
    return 0;
}
`,
          isMain: true,
        },
      ],
      stdin: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const localProjects = getLocalProjects();
    localProjects.push(initialProj);
    saveLocalProjects(localProjects);

    return { success: true, user: clientUser, token: clientToken };
  },

  // Login user
  async login(username: string, password: string): Promise<{ success: boolean; user: User; token: string; error?: string }> {
    const cleanUsername = username.trim();
    if (!cleanUsername || !password) {
      return { success: false, user: null as any, token: '', error: 'Informe usuário e senha para entrar.' };
    }

    // Try server API first
    const res = await safeFetchJson('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: cleanUsername, password }),
    });

    if (res.ok && res.data && res.data.success) {
      const user: User = res.data.user;
      const token: string = res.data.token;
      this.setSession(user, token);
      return { success: true, user, token };
    }

    // If server returned invalid credentials error (401), check if local user exists
    const localUsers = getLocalUsers();
    const localMatch = localUsers.find(
      (u) => u.username.toLowerCase() === cleanUsername.toLowerCase() && u.password === password
    );

    if (localMatch) {
      const user: User = {
        id: localMatch.id,
        username: localMatch.username,
        createdAt: localMatch.createdAt,
      };
      const token = `local_tok_${user.id}_${Date.now()}`;
      this.setSession(user, token);
      return { success: true, user, token };
    }

    if (res.data && res.data.error) {
      return { success: false, user: null as any, token: '', error: res.data.error };
    }

    return { success: false, user: null as any, token: '', error: 'Usuário ou senha incorretos.' };
  },

  // Verify / restore current session
  async getCurrentUser(): Promise<User | null> {
    const token = this.getToken();
    if (!token) return null;

    // Check if it's a local client token
    if (token.startsWith('local_tok_')) {
      return this.getCachedUser();
    }

    // Check server session
    const res = await safeFetchJson('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (res.ok && res.data && res.data.success) {
      const user: User = res.data.user;
      localStorage.setItem(USER_KEY, JSON.stringify(user));
      return user;
    }

    // Fallback to cached user if server is temporarily unreachable
    return this.getCachedUser();
  },

  // Get user projects (merges server + local database to guarantee no data loss)
  async getProjects(userId: string): Promise<UserProject[]> {
    const token = this.getToken();
    let serverProjects: UserProject[] = [];

    if (token && !token.startsWith('local_tok_')) {
      const res = await safeFetchJson('/api/projects', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok && res.data && Array.isArray(res.data.projects)) {
        serverProjects = res.data.projects;
      }
    }

    // Read local database projects for this user
    const localProjects = getLocalProjects().filter((p) => p.userId === userId);

    // Merge projects by ID and title
    const projectMap = new Map<string, UserProject>();

    // Add local first
    for (const p of localProjects) {
      projectMap.set(p.id, p);
    }

    // Overwrite/update with server version if present
    for (const p of serverProjects) {
      projectMap.set(p.id, p);
    }

    const merged = Array.from(projectMap.values()).sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );

    // Sync back to local database so projects are available offline
    saveLocalProjects(merged);

    return merged;
  },

  // Save project (Create or Update)
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
    const token = this.getToken();
    const title = data.title.trim() || 'Projeto sem título';

    let serverSavedProject: UserProject | null = null;

    if (token && !token.startsWith('local_tok_')) {
      const url = data.id ? `/api/projects/${data.id}` : '/api/projects';
      const method = data.id ? 'PUT' : 'POST';

      const res = await safeFetchJson(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title,
          name: title,
          description: data.description || '',
          files: data.files,
          stdin: data.stdin || '',
          compilerOptions: data.compilerOptions,
        }),
      });

      if (res.ok && res.data && res.data.project) {
        serverSavedProject = res.data.project;
      }
    }

    // Always update local database for guaranteed resilience and speed
    const localProjects = getLocalProjects();
    const projectId = serverSavedProject?.id || data.id || 'proj_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);

    const projectRecord: UserProject = {
      id: projectId,
      userId,
      title,
      name: title,
      description: data.description || '',
      files: data.files,
      stdin: data.stdin || '',
      compilerOptions: data.compilerOptions,
      updatedAt: new Date().toISOString(),
      createdAt: serverSavedProject?.createdAt || new Date().toISOString(),
    };

    const existingIndex = localProjects.findIndex((p) => p.id === projectId);
    if (existingIndex >= 0) {
      localProjects[existingIndex] = {
        ...localProjects[existingIndex],
        ...projectRecord,
      };
    } else {
      localProjects.unshift(projectRecord);
    }

    saveLocalProjects(localProjects);

    return {
      success: true,
      project: serverSavedProject || projectRecord,
    };
  },

  // Delete project
  async deleteProject(userId: string, projectId: string): Promise<boolean> {
    const token = this.getToken();

    if (token && !token.startsWith('local_tok_')) {
      await safeFetchJson(`/api/projects/${projectId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
    }

    // Always delete from local database
    const localProjects = getLocalProjects().filter((p) => !(p.id === projectId && p.userId === userId));
    saveLocalProjects(localProjects);
    return true;
  },

  // Export all projects as a JSON file backup
  exportProjectsBackup(userId: string): string {
    const projects = getLocalProjects().filter((p) => p.userId === userId);
    return JSON.stringify(
      {
        version: '1.0',
        exportedAt: new Date().toISOString(),
        userId,
        projects,
      },
      null,
      2
    );
  },

  // Import projects from JSON backup
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
