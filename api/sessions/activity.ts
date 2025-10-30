import { VercelRequest, VercelResponse } from '@vercel/node';
import { ensureDbInitialized } from '../_db.js';
import { CashDrawerActivity } from '../../types.js';
import { db } from '@vercel/postgres';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await ensureDbInitialized();
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
  }

  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const { sessionId, activity, userId, userName } = req.body as {
      sessionId: number;
      activity: CashDrawerActivity;
      userId: number;
      userName: string;
    };

    const result = await client.query(
      `UPDATE session_history
       SET activities = activities || $1::jsonb
       WHERE id = $2 AND "isOpen" = true
       RETURNING *;`,
      [JSON.stringify(activity), sessionId]
    );
    
    if (result.rowCount === 0) {
      throw new Error('Session not found or is closed');
    }
    const updatedSession = result.rows[0];

    await client.query(
      `INSERT INTO audit_logs (user_id, user_name, action, details)
       VALUES ($1, $2, 'CASH_DRAWER_ACTIVITY', $3);`,
      [userId, userName, `Activity: ${activity.type}, Amount: ${activity.amount}, Notes: ${activity.notes || activity.orderId || 'N/A'}`]
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