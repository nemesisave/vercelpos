import { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '../_db.js';
import { ParkedOrder, OrderItem } from '../../types.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'POST') {
    try {
      const { name, items } = req.body as { name: string, items: OrderItem[] };

      if (!name || !items || items.length === 0) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const newParkedOrder: ParkedOrder = {
        id: `parked-${Date.now()}`,
        name,
        items,
        parkedAt: new Date().toLocaleTimeString()
      };

      await sql`
        INSERT INTO parked_orders (id, name, items, "parkedAt")
        VALUES (${newParkedOrder.id}, ${newParkedOrder.name}, ${JSON.stringify(newParkedOrder.items)}, ${newParkedOrder.parkedAt})
      `;
      
      res.status(201).json(newParkedOrder);
    } catch (error) {
      console.error('Error parking order:', error);
      res.status(500).json({ error: (error as Error).message });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}