import { VercelRequest, VercelResponse } from '@vercel/node';
import { withTx } from '../_db.js';
import { UserUpdatePayload } from '../../types.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { id } = req.query;

  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid user ID' });
  }

  if (req.method === 'PUT') {
    try {
      const updates = req.body as UserUpdatePayload;

      const updatedUser = await withTx(async (tx) => {
        const beforeResult = await tx`SELECT * FROM users WHERE id = ${id}`;
        if (beforeResult.rows.length === 0) {
            throw new Error('User not found');
        }
        const currentUser = beforeResult.rows[0];
        
        const { password, ...safeCurrentUser } = currentUser;

        const setClauses = [];
        const values = [];
        let valueCount = 1;

        for (const [key, value] of Object.entries(updates)) {
            if (value !== undefined) {
                const dbKey = key === 'roleId' ? '"roleId"' : key === 'lastLogin' ? '"lastLogin"' : key;
                if (dbKey === 'password' && !value) continue; // Don't update password if it's an empty string
                
                setClauses.push(`${dbKey} = $${valueCount++}`);
                values.push(value);
            }
        }

        if (setClauses.length === 0) {
            return safeCurrentUser;
        }

        values.push(id);
        const query = `UPDATE users SET ${setClauses.join(', ')} WHERE id = $${valueCount} RETURNING *;`;

        const result = await tx.query(query, values);
        
        const { password: _, ...updatedUser } = result.rows[0];
        
        await tx`
          INSERT INTO audit_logs ("userId", "userName", action, details)
          VALUES (${id}, ${updatedUser.name}, 'UPDATE_USER', ${`Updated user details for ${updatedUser.name}`});
        `;

        return updatedUser;
      });
      
      res.status(200).json(updatedUser);

    } catch (error) {
      console.error(`Error updating user ${id}:`, error);
      if ((error as Error).message === 'User not found') {
        return res.status(404).json({ error: 'User not found' });
      }
      res.status(500).json({ error: (error as Error).message });
    }
  } else {
    res.setHeader('Allow', ['PUT']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}