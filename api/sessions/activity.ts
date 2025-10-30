import { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '../_db.js';
import { CashDrawerActivity, CashDrawerSession } from '../../types.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
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

    const sessionResult = await sql`SELECT * FROM session_history WHERE id = ${sessionId}`;
    if (sessionResult.rows.length === 0 || !(sessionResult.rows[0] as CashDrawerSession).isOpen) {
      return res.status(400).json({ error: 'Session not found or is closed' });
    }

    const currentActivities = (sessionResult.rows[0] as CashDrawerSession).activities || [];
    const newActivities = [...currentActivities, activity];

    const result = await sql`
      UPDATE session_history
      SET activities = ${JSON.stringify(newActivities)}
      WHERE id = ${sessionId}
      RETURNING *;
    `;
    const updatedSession = result.rows[0];

    await sql`
      INSERT INTO audit_logs ("userId", "userName", action, details)
      VALUES (${userId}, ${userName}, 'CASH_DRAWER_ACTIVITY', ${`Activity: ${activity.type}, Amount: ${activity.amount}, Notes: ${activity.notes || 'N/A'}`});
    `;

    res.status(200).json(updatedSession);
  } catch (error) {
    console.error('Error adding session activity:', error);
    res.status(500).json({ error: (error as Error).message });
  }
}
