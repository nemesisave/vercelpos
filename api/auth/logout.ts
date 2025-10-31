import { VercelRequest, VercelResponse } from '@vercel/node';
import { sql, ensureDbInitialized } from '../_db.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  await ensureDbInitialized();

  try {
    const sessionId = req.cookies.session_id;
    if (sessionId) {
      await sql`DELETE FROM auth_sessions WHERE id = ${sessionId};`;
    }

    // Expire the cookie
    const cookie = `session_id=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax; Secure`;
    res.setHeader('Set-Cookie', cookie);

    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
