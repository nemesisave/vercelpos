import { VercelRequest, VercelResponse } from '@vercel/node';
import { ensureDbInitialized } from '../_db.js';
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
    const { startingCash, openedBy, openedAt, userId } = req.body as {
      startingCash: number;
      openedBy: string;
      openedAt: string;
      userId: number;
    };
    
    // Check for an existing open session
    const openSessionResult = await client.query('SELECT id FROM session_history WHERE "isOpen" = true');
    if (openSessionResult.rowCount > 0) {
      await client.query('ROLLBACK'); // No changes made, but good practice
      return res.status(409).json({ error: 'An open session already exists.' });
    }

    const result = await client.query(
      `INSERT INTO session_history ("isOpen", "startingCash", "openedBy", "openedAt", activities)
       VALUES (true, $1, $2, $3, '[]')
       RETURNING *;`,
      [startingCash, openedBy, openedAt]
    );
    const newSession = result.rows[0];

    await client.query(
      `INSERT INTO audit_logs (user_id, user_name, action, details)
       VALUES ($1, $2, 'OPEN_CASH_DRAWER', $3);`,
       [userId, openedBy, `Opened session #${newSession.id} with starting cash of ${startingCash}`]
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