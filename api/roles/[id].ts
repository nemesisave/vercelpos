import { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from '../_db.js';
import { Permission } from '../../types.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { id } = req.query;

  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid role ID' });
  }

  if (req.method === 'PUT') {
    try {
        const { permissions } = req.body as { permissions: Permission[] };

        if (!permissions || !Array.isArray(permissions)) {
            return res.status(400).json({ error: 'Permissions array is required' });
        }

        const result = await sql`
            UPDATE roles
            SET permissions = ${permissions as any}
            WHERE id = ${id}
            RETURNING *;
        `;

        if (result.rowCount === 0) {
            return res.status(404).json({ error: 'Role not found' });
        }

        res.status(200).json(result.rows[0]);

    } catch (error) {
        console.error(`Error updating role ${id}:`, error);
        res.status(500).json({ error: (error as Error).message });
    }
  } else {
    res.setHeader('Allow', ['PUT']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}