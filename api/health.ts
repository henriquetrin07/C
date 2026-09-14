// Vercel Serverless Function for /api/health
export default function handler(_req: any, res: any) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');

  res.status(200).json({
    status: 'ok',
    mode: 'cloud',
    compilers: {
      gcc: true,
      tcc: true,
    },
  });
}
