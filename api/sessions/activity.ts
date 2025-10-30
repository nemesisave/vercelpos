import { VercelRequest, VercelResponse } from '@vercel/node';
import { sql, ensureDbInitialized } from '../_db.js';
import { CashDrawerActivity, CashDrawerSession } from '../../types.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await ensureDbInitialized();
  if (req.method !== 'POST') {
    return res.status(405).end('Method Not Allowed');
  }

  try {
    const { sessionId, activity, userId, userName } = req.body as {
      sessionId: number;
      activity: CashDrawerActivity;
      userId: number;
      userName: string;
    };

    const result = await sql`
      UPDATE session_history
      SET activities = activities || ${JSON.stringify(activity)}::jsonb
      WHERE id = ${sessionId} AND "isOpen" = true
      RETURNING *;
    `;
    
    if (result.rowCount === 0) {
      return res.status(400).json({ error: 'Session not found or is closed' });
    }
    const updatedSession = result.rows[0];

    await sql`
      INSERT INTO audit_logs ("userId", "userName", action, details)
      VALUES (${userId}, ${userName}, 'CASH_DRAWER_ACTIVITY', ${`Activity: ${activity.type}, Amount: ${activity.amount}, Notes: ${activity.notes || activity.orderId || 'N/A'}`});
    `;

    res.status(200).json(updatedSession);
  } catch (error) {
    console.error('Error adding session activity:', error);
    res.status(500).json({ error: (error as Error).message });
  }
}