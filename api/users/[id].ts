import { VercelRequest, VercelResponse } from '@vercel/node';
import { ensureDbInitialized } from '../_db.js';
import { UserUpdatePayload } from '../../types.js';
import { db } from '@vercel/postgres';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await ensureDbInitialized();
  const { id } = req.query;

  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid user ID' });
  }

  const client = await db.connect();
  try {
    await client.query('BEGIN');

    if (req.method === 'PUT') {
        const updates = req.body as UserUpdatePayload;
        
        const beforeResult = await client.query('SELECT * FROM users WHERE id = $1', [id]);
        if (beforeResult.rows.length === 0) {
            throw new Error('User not found');
        }

        const setClauses: string[] = [];
        const values: any[] = [];
        let valueCount = 1;

        for (const [key, value] of Object.entries(updates)) {
            if (value !== undefined) {
                const dbKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
                if (dbKey === 'password' && !value) continue;
                
                setClauses.push(`"${dbKey}" = $${valueCount++}`);
                values.push(value);
            }
        }

        if (setClauses.length === 0) {
            await client.query('COMMIT');
            const { password, ...safeCurrentUser } = beforeResult.rows[0];
            return res.status(200).json(safeCurrentUser);
        }

        values.push(id);
        const query = `UPDATE users SET ${setClauses.join(', ')} WHERE id = $${valueCount} RETURNING *;`;

        const result = await client.query(query, values);
        const { password: _, ...updatedUser } = result.rows[0];
        
        await client.query(
            `INSERT INTO audit_logs (user_id, user_name, action, details) VALUES ($1, $2, 'UPDATE_USER', $3)`,
            [id, updatedUser.name, `Updated user details for ${updatedUser.name}`]
        );

        await client.query('COMMIT');
        res.status(200).json(updatedUser);

    } else if (req.method === 'DELETE') {
        const { adminUserId, adminUserName } = req.body;

        const result = await client.query('UPDATE users SET "deleted_at" = NOW() WHERE id = $1 RETURNING name', [id]);
        if (result.rowCount === 0) {
            throw new Error('User not found');
        }
        const deletedUserName = result.rows[0].name;

        await client.query(
            `INSERT INTO audit_logs (user_id, user_name, action, details) VALUES ($1, $2, 'DELETE_USER', $3)`,
            [adminUserId, adminUserName, `Deleted user: ${deletedUserName} (ID: ${id})`]
        );
        
        await client.query('COMMIT');
        res.status(200).json({ success: true });
    } else {
        res.setHeader('Allow', ['PUT', 'DELETE']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(`Error processing user ${id}:`, error);
    if ((error as Error).message === 'User not found') {
      return res.status(404).json({ error: 'User not found' });
    }
    res.status(500).json({ error: (error as Error).message });
  } finally {
    client.release();
  }
}