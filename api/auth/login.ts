import { VercelRequest, VercelResponse } from '@vercel/node';
import { sql, ensureDbInitialized } from '../_db.js';
import { User } from '../../types.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  await ensureDbInitialized();

  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const userResult = await sql`
        SELECT * FROM users 
        WHERE username = ${username} AND status = 'active' AND "deleted_at" IS NULL;
    `;

    if (userResult.rowCount === 0) {
      return res.status(401).json({ error: 'Invalid credentials or user not active' });
    }
    
    const user = userResult.rows[0];

    // In a real app, use a secure password hashing library like bcrypt
    if (user.password !== password) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const sessionDurationHours = 8;
    const expiresAt = new Date(Date.now() + sessionDurationHours * 60 * 60 * 1000);

    const sessionResult = await sql`
        INSERT INTO auth_sessions (user_id, expires_at)
        VALUES (${user.id}, ${expiresAt.toISOString()})
        RETURNING id;
    `;
    const sessionId = sessionResult.rows[0].id;
    
    const cookie = `session_id=${sessionId}; HttpOnly; Path=/; Max-Age=${sessionDurationHours * 3600}; SameSite=Lax; Secure`;
    res.setHeader('Set-Cookie', cookie);
    
    const { password: _, pin: __, ...safeUser } = user;
    res.status(200).json(safeUser);

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
