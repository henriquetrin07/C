import {
  verifyToken,
  getUserProjects,
  createProject,
  updateProject,
  deleteProject,
} from '../server/db';

export default async function handler(req: any, res: any) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, error: 'Não autenticado' });
  }

  const token = authHeader.split(' ')[1];
  const payload = verifyToken(token);
  if (!payload) {
    return res.status(401).json({ success: false, error: 'Sessão expirada ou token inválido' });
  }

  const userId = payload.userId;
  const projectId = req.query?.id as string | undefined;

  try {
    if (req.method === 'GET') {
      const projects = await getUserProjects(userId);
      return res.status(200).json({ success: true, projects });
    }

    if (req.method === 'POST') {
      const { title, name, description, files, stdin, compilerOptions } = req.body || {};
      const project = await createProject(userId, {
        title: title || name || 'Projeto sem Título',
        description,
        files,
        stdin,
        compilerOptions,
      });
      return res.status(200).json({ success: true, project });
    }

    if (req.method === 'PUT') {
      if (!projectId) {
        return res.status(400).json({ success: false, error: 'ID do projeto não informado' });
      }
      const { title, name, description, files, stdin, compilerOptions } = req.body || {};
      const updated = await updateProject(projectId, userId, {
        title: title || name,
        description,
        files,
        stdin,
        compilerOptions,
      });
      if (!updated) {
        return res.status(404).json({ success: false, error: 'Projeto não encontrado' });
      }
      return res.status(200).json({ success: true, project: updated });
    }

    if (req.method === 'DELETE') {
      if (!projectId) {
        return res.status(400).json({ success: false, error: 'ID do projeto não informado' });
      }
      const success = await deleteProject(projectId, userId);
      return res.status(200).json({ success });
    }

    return res.status(405).json({ success: false, error: 'Método não permitido' });
  } catch (err: any) {
    console.error('Projects handler error:', err);
    return res.status(500).json({ success: false, error: err.message || 'Erro ao processar projetos' });
  }
}
