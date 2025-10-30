import { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '../_db.js';
import { SupplierUpdatePayload } from '../../types.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { id } = req.query;

  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid supplier ID' });
  }

  try {
    if (req.method === 'PUT') {
        const updates = req.body as SupplierUpdatePayload;
        
        const beforeResult = await sql`SELECT * FROM suppliers WHERE id = ${id}`;
        if (beforeResult.rows.length === 0) {
            return res.status(404).json({ error: 'Supplier not found' });
        }
        const current = beforeResult.rows[0];

        const newState = { ...current, ...updates };

        const result = await sql`
            UPDATE suppliers SET
                name = ${newState.name},
                "contactPerson" = ${newState.contactPerson},
                phone = ${newState.phone},
                email = ${newState.email},
                address = ${newState.address},
                notes = ${newState.notes}
            WHERE id = ${id}
            RETURNING *;
        `;
        
        return res.status(200).json(result.rows[0]);

    } else if (req.method === 'DELETE') {
        // Check if supplier is used in purchase orders
        const poCheck = await sql`SELECT 1 FROM purchase_orders WHERE "supplierId" = ${id} LIMIT 1;`;
        if (poCheck.rowCount > 0) {
            return res.status(400).json({ error: 'Cannot delete supplier with existing purchase orders.' });
        }

        const result = await sql`DELETE FROM suppliers WHERE id = ${id} RETURNING id;`;
        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Supplier not found' });
        }
        return res.status(200).json({ success: true });
    } else {
        res.setHeader('Allow', ['PUT', 'DELETE']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    console.error(`Error processing supplier ${id}:`, error);
    return res.status(500).json({ error: (error as Error).message });
  }
}