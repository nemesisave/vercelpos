import { VercelRequest, VercelResponse } from '@vercel/node';
import { sql, ensureDbInitialized } from '../_db.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await ensureDbInitialized();
  if (req.method !== 'POST') {
    return res.status(405).end('Method Not Allowed');
  }

  try {
    const { startingCash, openedBy, openedAt, userId } = req.body as {
      startingCash: number;
      openedBy: string;
      openedAt: string;
      userId: number;
    };
    
    // Check for an existing open session
    const openSession = await sql`SELECT id FROM session_history WHERE "isOpen" = true`;
    if (openSession.rowCount && openSession.rowCount > 0) {
      return res.status(409).json({ error: 'An open session already exists.' });
    }

    const result = await sql`
      INSERT INTO session_history ("isOpen", "startingCash", "openedBy", "openedAt", activities)
      VALUES (true, ${startingCash}, ${openedBy}, ${openedAt}, '[]')
      RETURNING *;
    `;
    const newSession = result.rows[0];

    await sql`
      INSERT INTO audit_logs ("userId", "userName", action, details)
      VALUES (${userId}, ${openedBy}, 'OPEN_CASH_DRAWER', ${`Opened session #${newSession.id} with starting cash of ${startingCash}`});
    `;
    
    res.status(201).json(newSession);
  } catch (error) {
    console.error('Error opening session:', error);
    res.status(500).json({ error: (error as Error).message });
  }
}