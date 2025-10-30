import { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '../_db.js';
import { CashDrawerSession } from '../../types.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { id } = req.query;
  
  if (req.method !== 'PUT') {
    return res.status(405).end('Method Not Allowed');
  }

  try {
    const { countedCash, closedBy, closedAt, userId } = req.body as {
        countedCash: number;
        closedBy: string;
        closedAt: string;
        userId: number;
    };

    const sessionResult = await sql`SELECT * FROM session_history WHERE id = ${id as string}`;
    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Session not found' });
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

    const expectedInDrawer = session.startingCash + cashSales + totalPayIns - totalPayOuts;
    const difference = countedCash - expectedInDrawer;

    const result = await sql`
      UPDATE session_history SET
        "isOpen" = false,
        "closingCash" = ${countedCash},
        difference = ${difference},
        "closedBy" = ${closedBy},
        "closedAt" = ${closedAt}
      WHERE id = ${id as string}
      RETURNING *;
    `;
    const closedSession = result.rows[0];

    await sql`
      INSERT INTO audit_logs ("userId", "userName", action, details)
      VALUES (${userId}, ${closedBy}, 'CLOSE_CASH_DRAWER', ${`Closed session #${id} with difference of ${difference.toFixed(2)}`});
    `;

    res.status(200).json(closedSession);

  } catch (error) {
    console.error(`Error closing session ${id}:`, error);
    res.status(500).json({ error: (error as Error).message });
  }
}
