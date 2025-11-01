import { VercelRequest, VercelResponse } from '@vercel/node';
import { ensureDbInitialized, sql, writeAuditLog } from '../_db.js';
import { CashDrawerActivity, User } from '../../types.js';
import { db } from '@vercel/postgres';

// Helper to get user from session
async function getAuthenticatedUser(req: VercelRequest): Promise<User | null> {
    const sessionId = req.cookies.session_id;
    if (!sessionId) return null;
    const sessionResult = await sql`SELECT user_id FROM auth_sessions WHERE id = ${sessionId} AND expires_at > NOW()`;
    if ((sessionResult?.rowCount ?? 0) === 0) return null;
    const userId = sessionResult.rows[0].user_id;
    const userResult = await sql`SELECT id, name, "roleId", username, "avatarUrl", status, "lastLogin" FROM users WHERE id = ${userId} AND deleted_at IS NULL`;
    if ((userResult?.rowCount ?? 0) === 0) return null;
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
      activity: Omit<CashDrawerActivity, 'id' | 'session_id' | 'user_id' | 'created_at'>;
    };

    // Verify session belongs to the user and is open
    const sessionCheck = await client.query(
        'SELECT id FROM cash_drawer_sessions WHERE id = $1 AND user_id = $2 AND status = \'open\'',
        [sessionId, user.id]
    );

    if (sessionCheck.rowCount === 0) {
        throw new Error('Session not found, is closed, or does not belong to you.');
    }

    await client.query(
      `INSERT INTO cash_drawer_activity (session_id, user_id, type, amount, notes, order_id, payment_method)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [sessionId, user.id, activity.type, activity.amount, activity.notes, activity.order_id, activity.payment_method]
    );

    const activitiesResult = await client.query('SELECT * FROM cash_drawer_activity WHERE session_id = $1 ORDER BY created_at ASC', [sessionId]);

    await writeAuditLog({
        userId: user.id,
        userName: user.name,
        action: 'CASH_DRAWER_ACTIVITY',
        details: { ...activity, sessionId }
    });

    await client.query('COMMIT');
    res.status(200).json(activitiesResult.rows);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error adding session activity:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    res.status(500).json({ error: errorMessage });
  } finally {
    client.release();
  }
}