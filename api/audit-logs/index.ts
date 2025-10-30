import { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '../_db.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'POST') {
    try {
      const { userId, userName, action, details } = req.body as {
        userId: number;
        userName: string;
        action: string;
        details: string;
      };
      
      const result = await sql`
        INSERT INTO audit_logs ("userId", "userName", action, details)
        VALUES (${userId}, ${userName}, ${action}, ${details})
        RETURNING *;
      `;
      
      res.status(201).json(result.rows[0]);
    } catch (error) {
      console.error('Error adding audit log:', error);
      res.status(500).json({ error: (error as Error).message });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
