import { VercelRequest, VercelResponse } from '@vercel/node';
import { ensureDbInitialized, sql, writeAuditLog, writeSessionHistory } from '../_db.js';
import { db } from '@vercel/postgres';
import { User } from '../../types.js';

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
    const { opening_amount } = req.body as {
      opening_amount: number;
    };
    
    // Check for an existing open session for this user
    const openSessionResult = await client.query('SELECT id FROM cash_drawer_sessions WHERE status = \'open\' AND user_id = $1 ORDER BY opened_at DESC LIMIT 1', [user.id]);
    if ((openSessionResult?.rowCount ?? 0) > 0) {
      await client.query('ROLLBACK'); // No changes made, but good practice
      return res.status(409).json({ error: 'You already have an open session.' });
    }

    const result = await client.query(
      `INSERT INTO cash_drawer_sessions (user_id, opening_amount, status, opened_at, opened_by)
       VALUES ($1, $2, 'open', NOW(), $3)
       RETURNING *;`,
      [user.id, opening_amount, user.name]
    );
    const newSession = result.rows[0];

    await writeAuditLog({
        userId: user.id,
        userName: user.name,
        action: 'OPEN_CASH_DRAWER',
        details: { sessionId: newSession.id, opening_amount }
    });
    
    await writeSessionHistory({
      userId: user.id,
      drawerSessionId: newSession.id,
      action: 'open',
      openingAmount: newSession.opening_amount,
      notes: `Session opened by ${user.name}`
    });
    
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