import { VercelRequest, VercelResponse } from '@vercel/node';
import { ensureDbInitialized, sql, writeAuditLog, writeSessionHistory } from '../_db.js';
import { CashDrawerSession, User, CashDrawerActivity } from '../../types.js';
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
    const { closing_amount } = req.body as {
        closing_amount: number;
    };

    const sessionResult = await client.query('SELECT * FROM cash_drawer_sessions WHERE id = $1 AND user_id = $2', [id, user.id]);
    if (sessionResult.rows.length === 0) {
      throw new Error('Session not found for this user or you do not have permission.');
    }
    const session: CashDrawerSession = sessionResult.rows[0] as any;
    if (session.status !== 'open') {
        throw new Error('This session is already closed.');
    }

    const activitiesResult = await client.query('SELECT * FROM cash_drawer_activity WHERE session_id = $1', [id]);
    const activities: CashDrawerActivity[] = activitiesResult.rows as any;

    const cashSales = activities
        .filter(a => a.type === 'sale' && a.payment_method === 'cash')
        .reduce((sum, a) => sum + Number(a.amount), 0);
    const totalPayIns = activities
        .filter(a => a.type === 'pay-in')
        .reduce((sum, a) => sum + Number(a.amount), 0);
    const totalPayOuts = activities
        .filter(a => a.type === 'pay-out')
        .reduce((sum, a) => sum + Number(a.amount), 0);

    const expectedInDrawer = Number(session.opening_amount) + cashSales + totalPayIns - totalPayOuts;
    const difference = closing_amount - expectedInDrawer;

    const result = await client.query(
      `UPDATE cash_drawer_sessions SET
        status = 'closed',
        closing_amount = $1,
        difference = $2,
        closed_by = $3,
        closed_at = NOW()
      WHERE id = $4 AND user_id = $5
      RETURNING *;`,
      [closing_amount, difference, user.name, id, user.id]
    );
    const closedSession = result.rows[0];

    await writeAuditLog({
        userId: user.id,
        userName: user.name,
        action: 'CLOSE_CASH_DRAWER',
        details: { sessionId: id, difference }
    });

    await writeSessionHistory({
        userId: user.id,
        drawerSessionId: closedSession.id,
        action: 'close',
        closingAmount: closedSession.closing_amount,
        difference: closedSession.difference,
        notes: `Session closed by ${user.name}`
    });

    await client.query('COMMIT');
    res.status(200).json({ success: true, message: 'Cash drawer closed successfully for this user.', session: closedSession });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`Error closing session ${id}:`, error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    if (errorMessage.includes('Session not found')) {
        return res.status(404).json({ success: false, error: errorMessage });
    }
    res.status(500).json({ success: false, error: errorMessage });
  } finally {
    client.release();
  }
}