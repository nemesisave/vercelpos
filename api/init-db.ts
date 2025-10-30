import { VercelRequest, VercelResponse } from '@vercel/node';
import { sql, schemaSql, seedInitialData } from './_db.js';

export default async function handler(
  request: VercelRequest,
  response: VercelResponse,
) {
  try {
    const statements = schemaSql.split(';').filter(s => s.trim());
    for (const statement of statements) {
        if (statement) {
            await sql(statement);
        }
    }
    await seedInitialData();
    return response.status(200).json({ message: 'Database initialized successfully' });
  } catch (error) {
    console.error('Error initializing database:', error);
    return response.status(500).json({ error: (error as Error).message });
  }
}