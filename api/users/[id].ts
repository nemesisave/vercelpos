import { VercelRequest, VercelResponse } from '@vercel/node';
import { sql, withTx } from '../_db.js';
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
            // This will cause a rollback
            throw new Error('User not found');
        }
        const currentUser = beforeResult.rows[0];

        // Merge updates with current data
        const newUserState = { ...currentUser, ...updates };

        // Handle date formatting for lastLogin
        const lastLogin = newUserState.lastLogin ? new Date(newUserState.lastLogin).toISOString() : null;

        const result = await tx`
            UPDATE users SET
                name = ${newUserState.name},
                username = ${newUserState.username},
                password = ${updates.password || currentUser.password},
                pin = ${newUserState.pin},
                "roleId" = ${newUserState.roleId},
                status = ${newUserState.status},
                "lastLogin" = ${lastLogin}
            WHERE id = ${id}
            RETURNING *;
        `;
        const updatedUser = result.rows[0];

        await tx`
          INSERT INTO audit_logs ("userId", "userName", action, details)
          VALUES (${id}, ${updatedUser.name}, 'UPDATE_USER', ${`Updated user details for ${updatedUser.name}`});
        `;

        return updatedUser;
      });
      
      if (!updatedUser) {
        return res.status(404).json({ error: 'User not found' });
      }

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
