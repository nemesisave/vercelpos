import { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '../_db.js';
import { NewCustomerPayload } from '../../types.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'POST') {
    try {
      const { name, phone, email, address, notes } = req.body as NewCustomerPayload;
      if (!name) {
        return res.status(400).json({ error: 'Customer name is required' });
      }

      const result = await sql`
        INSERT INTO customers (name, phone, email, address, notes)
        VALUES (${name}, ${phone}, ${email}, ${address}, ${notes})
        RETURNING *;
      `;
      const newCustomer = result.rows[0];
      
      res.status(201).json(newCustomer);

    } catch (error) {
      console.error('Error adding customer:', error);
      res.status(500).json({ error: (error as Error).message });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
