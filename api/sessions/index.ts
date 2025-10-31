import { VercelRequest, VercelResponse } from '@vercel/node';
import { ensureDbInitialized, sql } from '../_db.js';
import { db } from '@vercel/postgres';
import { User } from '../../types.js';

// Helper to get user from session
async function getAuthenticatedUser(req: VercelRequest): Promise<User | null> {
    const sessionId = req.cookies.session_id;
    if (!sessionId) return null;
    const sessionResult = await sql`SELECT user_id FROM auth_sessions WHERE id = ${sessionId} AND expires_at > NOW()`;
    if (sessionResult.rowCount === 0) return null;
    const userId = sessionResult.rows[0].user_id;
    const userResult = await sql`SELECT id, name, "roleId", username, "avatarUrl", status, "lastLogin" FROM users WHERE id = ${userId} AND "deleted_at" IS NULL`;
    if (userResult.rowCount === 0) return null;
    return userResult.rows[0] as User;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await ensureDbInitialized();
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }
  
  const user = await getAuthenticatedUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const { startingCash, openedAt } = req.body as {
      startingCash: number;
      openedAt: string;
    };
    
    // Check for an existing open session
    const openSessionResult = await client.query('SELECT id FROM session_history WHERE "isOpen" = true');
    if (openSessionResult && openSessionResult.rowCount != null && openSessionResult.rowCount > 0) {
      await client.query('ROLLBACK'); // No changes made, but good practice
      return res.status(409).json({ error: 'An open session already exists.' });
    }

    const result = await client.query(
      `INSERT INTO session_history ("isOpen", "startingCash", "openedBy", "openedAt", activities)
       VALUES (true, $1, $2, $3, '[]')
       RETURNING *;`,
      [startingCash, user.name, openedAt]
    );
    const newSession = result.rows[0];

    await client.query(
      `INSERT INTO audit_logs (user_id, user_name, action, details)
       VALUES ($1, $2, 'OPEN_CASH_DRAWER', $3);`,
       [user.id, user.name, `Opened session #${newSession.id} with starting cash of ${startingCash}`]
    );
    
    await client.query('COMMIT');
    res.status(201).json(newSession);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error opening session:', error);
    res.status(500).json({ error: (error as Error).message });
  } finally {
      client.release();
  }
}
