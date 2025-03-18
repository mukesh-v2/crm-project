import type { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';

export const config = {
    api: {
        bodyParser: {
            sizeLimit: '10mb',
        },
    },
};

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== 'POST') {
        return res.status(405).json({ message: 'Method not allowed' });
    }

    try {
        const { data } = req.body;
        if (!data) {
            return res.status(400).json({ message: 'No data provided' });
        }

        const buffer = Buffer.from(data);
        const filePath = path.join(process.cwd(), 'public', 'data', 'crm-data.xlsx');
        
        fs.writeFileSync(filePath, buffer);
        
        res.status(200).json({ message: 'File updated successfully' });
    } catch (error) {
        console.error('Error saving file:', error);
        res.status(500).json({ message: 'Error saving file' });
    }
}