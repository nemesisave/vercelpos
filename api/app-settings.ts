import { VercelRequest, VercelResponse } from '@vercel/node';
import { sql } from './_db.js';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
) {
    if (req.method === 'GET') {
        try {
            const settings = await sql`SELECT theme, language FROM app_settings WHERE id = 1`;
            if (settings.length === 0) {
                // Should have been seeded, but as a fallback
                const defaultSettings = await sql`INSERT INTO app_settings (id, theme, language) VALUES (1, 'default', 'es') ON CONFLICT(id) DO UPDATE SET theme = 'default' RETURNING theme, language`;
                return res.status(200).json(defaultSettings[0]);
            }
            return res.status(200).json(settings[0]);
        } catch (error) {
            return res.status(500).json({ error: (error as Error).message });
        }
    } else if (req.method === 'PUT') {
        try {
            const { theme, language } = req.body;
            if (!theme && !language) {
                return res.status(400).json({ error: 'theme or language is required' });
            }

            let updatedSettings;
            if (theme && language) {
                 updatedSettings = await sql`UPDATE app_settings SET theme = ${theme}, language = ${language} WHERE id = 1 RETURNING theme, language`;
            } else if (theme) {
                updatedSettings = await sql`UPDATE app_settings SET theme = ${theme} WHERE id = 1 RETURNING theme, language`;
            } else { // language
                updatedSettings = await sql`UPDATE app_settings SET language = ${language} WHERE id = 1 RETURNING theme, language`;
            }
            
            return res.status(200).json(updatedSettings[0]);
        } catch (error) {
             return res.status(500).json({ error: (error as Error).message });
        }
    } else {
        res.setHeader('Allow', ['GET', 'PUT']);
        res.status(405).end(`Method ${req.method} Not Allowed`);
    }
}
