import { VercelRequest, VercelResponse } from '@vercel/node';
import { ensureDbInitialized, sql } from '../_db.js';
import { CashDrawerSession, User } from '../../types.js';
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
  const { id } = req.query;
  
  if (req.method !== 'PUT') {
    res.setHeader('Allow', ['PUT']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const user = await getAuthenticatedUser(req);
  if (!user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const { countedCash, closedAt } = req.body as {
        countedCash: number;
        closedAt: string;
    };

    const sessionResult = await client.query('SELECT * FROM session_history WHERE id = $1', [id]);
    if (sessionResult.rows.length === 0) {
      throw new Error('Session not found');
    }
    const session: CashDrawerSession = sessionResult.rows[0] as any;

    const cashSales = session.activities
        .filter(a => a.type === 'sale' && a.paymentMethod === 'cash')
        .reduce((sum, a) => sum + a.amount, 0);
    const totalPayIns = session.activities
        .filter(a => a.type === 'pay-in')
        .reduce((sum, a) => sum + a.amount, 0);
    const totalPayOuts = session.activities
        .filter(a => a.type === 'pay-out')
        .reduce((sum, a) => sum + a.amount, 0);

    const expectedInDrawer = Number(session.startingCash) + cashSales + totalPayIns - totalPayOuts;
    const difference = countedCash - expectedInDrawer;

    const result = await client.query(
      `UPDATE session_history SET
        "isOpen" = false,
        "closingCash" = $1,
        difference = $2,
        "closedBy" = $3,
        "closedAt" = $4
      WHERE id = $5
      RETURNING *;`,
      [countedCash, difference, user.name, closedAt, id]
    );
    const closedSession = result.rows[0];

    await client.query(
      `INSERT INTO audit_logs (user_id, user_name, action, details)
       VALUES ($1, $2, 'CLOSE_CASH_DRAWER', $3);`,
      [user.id, user.name, `Closed session #${id} with difference of ${difference.toFixed(2)}`]
    );

    await client.query('COMMIT');
    res.status(200).json({ success: true, message: 'Cash drawer session closed successfully.', session: closedSession });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`Error closing session ${id}:`, error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    if (errorMessage === 'Session not found') {
        return res.status(404).json({ success: false, error: errorMessage });
    }
    res.status(500).json({ success: false, error: errorMessage });
  } finally {
    client.release();
  }
}
