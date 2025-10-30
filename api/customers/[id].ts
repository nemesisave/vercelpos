import { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '../_db.js';
import { CustomerUpdatePayload } from '../../types.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { id } = req.query;

  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid customer ID' });
  }

  try {
    if (req.method === 'PUT') {
        const updates = req.body as CustomerUpdatePayload;
        
        const beforeResult = await sql`SELECT * FROM customers WHERE id = ${id}`;
        if (beforeResult.rows.length === 0) {
            return res.status(404).json({ error: 'Customer not found' });
        }
        const currentCustomer = beforeResult.rows[0];

        const newState = { ...currentCustomer, ...updates };

        const result = await sql`
            UPDATE customers SET
                name = ${newState.name},
                phone = ${newState.phone},
                email = ${newState.email},
                address = ${newState.address},
                notes = ${newState.notes}
            WHERE id = ${id}
            RETURNING *;
        `;
        
        return res.status(200).json(result.rows[0]);

    } else if (req.method === 'DELETE') {
        const result = await sql`DELETE FROM customers WHERE id = ${id} RETURNING id;`;
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Customer not found' });
        }
        return res.status(200).json({ success: true });
    } else {
        res.setHeader('Allow', ['PUT', 'DELETE']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    console.error(`Error processing customer ${id}:`, error);
    return res.status(500).json({ error: (error as Error).message });
  }
}