import {
  findUserByUsername,
  verifyPassword,
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
    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error: 'Informe usuário e senha para entrar.',
      });
    }

    const user = await findUserByUsername(username);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Usuário ou senha incorretos.',
      });
    }

    const isValid = verifyPassword(password, user.passwordHash, user.salt);
    if (!isValid) {
      return res.status(401).json({
        success: false,
        error: 'Usuário ou senha incorretos.',
      });
    }

    const token = generateToken(user);

    return res.status(200).json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        createdAt: user.createdAt,
      },
      token,
    });
  } catch (err: any) {
    console.error('Login error:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Erro interno ao realizar login.',
    });
  }
}
