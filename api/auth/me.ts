import { VercelRequest, VercelResponse } from '@vercel/node';
import { sql, ensureDbInitialized } from '../_db.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
  await ensureDbInitialized();

  try {
    const sessionId = req.cookies.session_id;
    if (!sessionId) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const sessionResult = await sql`
        SELECT user_id FROM auth_sessions
        WHERE id = ${sessionId} AND expires_at > NOW()
    `;

    if (sessionResult.rowCount === 0) {
      return res.status(401).json({ error: 'Session not found or expired' });
    }

    const userId = sessionResult.rows[0].user_id;

    const userResult = await sql`
        SELECT id, name, "roleId", username, "avatarUrl", status, "lastLogin"
        FROM users
        WHERE id = ${userId} AND "deleted_at" IS NULL
    `;

    if (userResult.rowCount === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json(userResult.rows[0]);
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
