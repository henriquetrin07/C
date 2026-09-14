import {
  findUserByUsername,
  createUser,
  generateToken,
} from '../../server/db';

export default async function handler(req: any, res: any) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Accept');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Método não permitido' });
  }

  try {
    const { username, password } = req.body || {};
    if (!username || typeof username !== 'string' || username.trim().length < 3) {
      return res.status(400).json({
        success: false,
        error: 'O nome de usuário deve ter pelo menos 3 caracteres.',
      });
    }

    if (!password || typeof password !== 'string' || password.length < 4) {
      return res.status(400).json({
        success: false,
        error: 'A senha deve ter pelo menos 4 caracteres.',
      });
    }

    const cleanUsername = username.trim();
    const existing = await findUserByUsername(cleanUsername);
    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'Nome de usuário já existe. Escolha outro ou entre com sua senha.',
      });
    }

    const newUser = await createUser(cleanUsername, password);
    const token = generateToken(newUser);

    return res.status(200).json({
      success: true,
      user: {
        id: newUser.id,
        username: newUser.username,
        createdAt: newUser.createdAt,
      },
      token,
    });
  } catch (err: any) {
    console.error('Register error:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Erro interno ao criar conta.',
    });
  }
}
