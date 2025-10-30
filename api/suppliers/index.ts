import { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '../_db.js';
import { NewSupplierPayload } from '../../types.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'POST') {
    try {
      const { name, contactPerson, phone, email, address, notes } = req.body as NewSupplierPayload;
      if (!name || !contactPerson) {
        return res.status(400).json({ error: 'Name and Contact Person are required' });
      }

      const result = await sql`
        INSERT INTO suppliers (name, "contactPerson", phone, email, address, notes)
        VALUES (${name}, ${contactPerson}, ${phone}, ${email}, ${address}, ${notes})
        RETURNING *;
      `;
      const newSupplier = result.rows[0];
      
      res.status(201).json(newSupplier);

    } catch (error) {
      console.error('Error adding supplier:', error);
      res.status(500).json({ error: (error as Error).message });
    }
  } else {
    res.setHeader('Allow', ['POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
