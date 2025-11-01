import { VercelRequest, VercelResponse } from '@vercel/node';
import { ensureDbInitialized, sql, writeAuditLog } from '../_db.js';
import { UserUpdatePayload, User } from '../../types.js';
import { db } from '@vercel/postgres';

// Helper to get user from session
async function getAuthenticatedUser(req: VercelRequest): Promise<User | null> {
    const sessionId = req.cookies.session_id;
    if (!sessionId) return null;
    const sessionResult = await sql`SELECT user_id FROM auth_sessions WHERE id = ${sessionId} AND expires_at > NOW()`;
    if ((sessionResult?.rowCount ?? 0) === 0) return null;
    const userId = sessionResult.rows[0].user_id;
    const userResult = await sql`SELECT id, name, "roleId", username, "avatarUrl", status, "lastLogin" FROM users WHERE id = ${userId} AND deleted_at IS NULL`;
    if ((userResult?.rowCount ?? 0) === 0) return null;
    return userResult.rows[0] as User;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await ensureDbInitialized();
  const { id } = req.query;

  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid user ID' });
  }

  const actor = await getAuthenticatedUser(req);
  if (!actor) {
    return res.status(401).json({ error: "Unauthorized" });
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
                const dbKey = key;
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
        
        await writeAuditLog({
            userId: actor.id,
            userName: actor.name,
            action: 'UPDATE_USER',
            entity: 'users',
            entityId: id,
            details: { updates: Object.keys(updates) }
        });

        await client.query('COMMIT');
        res.status(200).json(updatedUser);

    } else if (req.method === 'DELETE') {
        // Hard delete the user
        const result = await client.query('DELETE FROM users WHERE id = $1 RETURNING name', [id]);
        if (result.rowCount === 0) {
            throw new Error('User not found');
        }
        const deletedUserName = result.rows[0].name;
        
        await writeAuditLog({
            userId: actor.id,
            userName: actor.name,
            action: 'DELETE_USER',
            entity: 'users',
            entityId: id,
            details: { deletedUserName }
        });
        
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