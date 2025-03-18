import express from 'express';
import multer from 'multer';
import * as XLSX from 'xlsx';

const router = express.Router();
const upload = multer({ dest: 'uploads/' });

router.post('/save-excel', upload.single('file'), (req, res) => {
  try {
    // Your Excel processing logic here
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const workbook = XLSX.readFile(req.file.path);
    // Process your Excel file
    
    res.status(200).json({ message: 'File processed successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Error processing file' });
  }
});

export default router;