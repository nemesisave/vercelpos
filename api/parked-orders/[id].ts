import { VercelRequest, VercelResponse } from '@vercel/node';
import { sql, ensureDbInitialized } from '../_db.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await ensureDbInitialized();
  const { id } = req.query;

  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid parked order ID' });
  }
  
  if (req.method === 'DELETE') {
    try {
        const result = await sql`DELETE FROM parked_orders WHERE id = ${id} RETURNING id;`;
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Parked order not found' });
        }
        return res.status(200).json({ success: true });
    } catch (error) {
        console.error(`Error deleting parked order ${id}:`, error);
        return res.status(500).json({ error: (error as Error).message });
    }
  } else {
    res.setHeader('Allow', ['DELETE']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}