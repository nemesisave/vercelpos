import { VercelRequest, VercelResponse } from '@vercel/node';
import { ensureDbInitialized, sql } from '../_db.js';
import { CashDrawerActivity, User } from '../../types.js';
import { db } from '@vercel/postgres';

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
    const { sessionId, activity } = req.body as {
      sessionId: number;
      activity: CashDrawerActivity;
    };

    const result = await client.query(
      `UPDATE session_history
       SET activities = activities || $1::jsonb
       WHERE id = $2 AND "isOpen" = true AND user_id = $3
       RETURNING *;`,
      [JSON.stringify(activity), sessionId, user.id]
    );
    
    if (result.rowCount === 0) {
      throw new Error('Session not found, is closed, or does not belong to you.');
    }
    const updatedSession = result.rows[0];

    await client.query(
      `INSERT INTO audit_logs (user_id, user_name, action, details)
       VALUES ($1, $2, 'CASH_DRAWER_ACTIVITY', $3);`,
      [user.id, user.name, `Activity: ${activity.type}, Amount: ${activity.amount}, Notes: ${activity.notes || activity.orderId || 'N/A'}`]
    );

    await client.query('COMMIT');
    res.status(200).json(updatedSession);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error adding session activity:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    res.status(500).json({ error: errorMessage });
  } finally {
    client.release();
  }
}