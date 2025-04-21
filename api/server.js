require('dotenv').config({ path: __dirname + '/.env' });
const express = require('express');
const cors = require('cors');
const { connect } = require('couchbase');
const multer = require('multer');
const XLSX = require('xlsx');
const path = require('path');

const app = express();
const port = process.env.PORT || 5000;

// Couchbase connection configuration
const connectionString = 'couchbases://cb.ikgtzjgatttqqvi.cloud.couchbase.com';
const username = 'EnvirocareLabs25';
const password = 'Envirocare@2025';
const bucketName = 'crm-db';


function excelDateToString(serial) {
    if (!serial) return '';
    if (typeof serial === 'string') {
      if (serial.includes('YEARS')) return serial;
      // If it's already in YYYY-MM-DD format, return as is
      if (serial.match(/^\d{4}-\d{2}-\d{2}$/)) return serial;
    }
    
    // Excel date serial numbers start from December 30, 1899
    const utc_days = Math.floor(serial - 25569);
    const utc_value = utc_days * 86400;
    const date_info = new Date(utc_value * 1000);
    
    const year = date_info.getFullYear();
    const month = (date_info.getMonth() + 1).toString().padStart(2, '0');
    const day = date_info.getDate().toString().padStart(2, '0');
    
    return `${year}-${month}-${day}`;
  }
  
  // Update the isExpired function
  function isExpired(expiryDate) {
    if (!expiryDate || expiryDate.includes('YEARS')) return false;
    
    const expiry = new Date(expiryDate);
    const today = new Date();
    // Reset time portion for accurate date comparison
    expiry.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    return expiry < today;
  }

// CRM Schema
let cluster;
let bucket;
let collection;

async function initializeCouchbase() {
  try {
    cluster = await connect(connectionString, {
      username: username,
      password: password,
      bucketName: bucketName
    });
    
    bucket = cluster.bucket(bucketName);
    collection = bucket.defaultCollection();
    
    // Create primary index if it doesn't exist
    const queryResult = await cluster.query(
      'CREATE PRIMARY INDEX ON `crm-db` IF NOT EXISTS'
    );
    
    console.log('Successfully connected to Couchbase!');
    return loadInitialData();
  } catch (error) {
    console.error('Couchbase connection failed:', error);
    process.exit(1);
  }
}

// Routes
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'CRM API Server is running' });
});

app.get('/api/crm', async (req, res) => {
  try {
    const query = 'SELECT * FROM `crm-db`';
    const result = await cluster.query(query);
    const crms = result.rows.map(crm => ({
      ...crm,
      status: isExpired(crm.expiryDate) ? 'expired' : crm.status
    }));
    res.json(crms);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

app.post('/api/crm', async (req, res) => {
  try {
    const id = `crm::${req.body.labCode}`;
    const document = {
      ...req.body,
      type: 'crm',
      createdAt: new Date().toISOString()
    };
    
    await collection.insert(id, document);
    res.status(201).json({ id, ...document });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.put('/api/crm/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['active', 'consumed', 'expired'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status value' });
    }

    const result = await collection.get(`crm::${id}`);
    const updatedDoc = {
      ...result.content,
      status: status
    };

    await collection.replace(`crm::${id}`, updatedDoc);
    res.json(updatedDoc);
  } catch (error) {
    console.error('Status update error:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});

app.put('/api/crm/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await collection.get(`crm::${id}`);
    const updatedDoc = {
      ...result.content,
      ...req.body,
      updatedAt: new Date().toISOString()
    };

    await collection.replace(`crm::${id}`, updatedDoc);
    res.json(updatedDoc);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.delete('/api/crm/:id', async (req, res) => {
  try {
    await collection.remove(`crm::${req.params.id}`);
    res.json({ message: 'CRM deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Bulk operations
app.post('/api/crm/bulk', async (req, res) => {
  try {
    const entries = req.body;
    if (!Array.isArray(entries) || entries.length === 0) {
      return res.status(400).json({ message: 'Invalid data format or empty array' });
    }

    const operations = entries.map(entry => ({
      id: `crm::${entry.labCode}`,
      document: {
        ...entry,
        type: 'crm',
        createdAt: new Date().toISOString()
      }
    }));

    const results = await Promise.all(
      operations.map(op => collection.insert(op.id, op.document))
    );

    res.status(201).json(results);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Excel upload configuration and route
const storage = multer.diskStorage({
  destination: './uploads/',
  filename: (req, file, cb) => {
    cb(null, 'CRM_data.xlsx');
  }
});

const upload = multer({ storage: storage });

app.post('/api/crm/upload-excel', upload.single('file'), async (req, res) => {
  try {
    const workbook = XLSX.readFile('./uploads/CRM_data.xlsx');
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet);

    const formattedData = jsonData.map(row => ({
      labCode: String(row['Lab Code'] || '').trim().toUpperCase(),
      name: String(row['Name'] || ''),
      expiryDate: String(row['Expiry Date'] || ''),
      make: String(row['Make'] || ''),
      quantity: String(row['Quantity'] || ''),
      purity: String(row['Purity'] || ''),
      productCode: String(row['Product Code'] || ''),
      casNo: String(row['CAS No'] || ''),
      section: String(row['Section'] || ''),
      location: String(row['Location'] || ''),
      boxNo: String(row['Box No'] || ''),
      remarks: String(row['Remarks'] || ''),
      status: 'active',
      orderPlaced: false,
      type: 'crm',
      createdAt: new Date().toISOString()
    }));

    const operations = formattedData.map(doc => ({
      id: `crm::${doc.labCode}`,
      document: doc
    }));

    await Promise.all(
      operations.map(op => collection.insert(op.id, op.document))
    );

    res.json({ message: 'Excel data imported successfully' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Initialize and start server
async function startServer() {
  await initializeCouchbase();
  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
}

startServer().catch(console.error);