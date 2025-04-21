const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const multer = require('multer');
const XLSX = require('xlsx');
const path = require('path');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;
app.get('/api', (req, res) => {
  res.json({
    message: 'Welcome to the CRM API',
    endpoints: {
      getAllCRMs: '/api/crm',
      createCRM: '/api/crm (POST)',
      updateCRM: '/api/crm/:id (PUT)',
      deleteCRM: '/api/crm/:id (DELETE)',
      bulkUpload: '/api/crm/bulk (POST)',
      uploadExcel: '/api/crm/upload-excel (POST)'
    }
  });
});
app.use(cors());
app.use(express.json());

// Single MongoDB connection using mongoose
mongoose.connect(process.env.MONGODB_URI, {
  serverApi: {
    version: '1',
    strict: true,
    deprecationErrors: true,
  }
})
.then(() => {
  console.log("Successfully connected to MongoDB Atlas!");
  return loadInitialData();
})
.then(() => {
  console.log('Initial data load complete');
})
.catch((error) => {
  console.error("Connection to MongoDB failed:", error);
  process.exit(1);
});


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
const crmSchema = new mongoose.Schema({
  labCode: { 
    type: String, 
    required: true 
  },
  name: String,
  expiryDate: String,
  make: String,
  quantity: String,
  purity: String,
  productCode: String,
  casNo: String,
  section: String,
  location: String,
  boxNo: String,
  remarks: String,
  status: String,
  orderPlaced: Boolean,
  notRequired: Boolean
});

crmSchema.pre('save', function(next) {
    this.labCode = this.labCode.trim().toUpperCase();
    next();
  });
crmSchema . index ( { labCode: 1 } , { unique: true } ) ;
const CRM = mongoose.model('CRM', crmSchema);

// Routes
// Add a test route for the root path
app.get('/', (req, res) => {
  res.json({ message: 'CRM API Server is running' });
});

app.get('/api/crm', async (req, res) => {
    try {
      const crms = await CRM.find();
      const updatedCrms = crms.map(crm => ({
        ...crm.toObject(),
        status: isExpired(crm.expiryDate) ? 'expired' : crm.status
      }));
      res.json(updatedCrms);
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  });

app.post('/api/crm', async (req, res) => {
  try {
    const crm = new CRM(req.body);
    const savedCrm = await crm.save();
    res.status(201).json(savedCrm);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

app.put('/api/crm/:id/status', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    // Validate status
    const validStatuses = ['active', 'consumed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: 'Invalid status value' });
    }

    const updatedCrm = await CRM.findByIdAndUpdate(
      id,
      { $set: { status } },
      { new: true }
    );

    if (!updatedCrm) {
      return res.status(404).json({ message: 'CRM not found' });
    }

    res.json(updatedCrm);
  } catch (error) {
    console.error('Status update error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

app.put('/api/crm/:id', async (req, res) => {
  try {
    const updates = { ...req.body };
    delete updates._id; // Remove _id if present

    const updatedCrm = await CRM.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    );

    if (!updatedCrm) {
      return res.status(404).json({ message: 'CRM not found' });
    }

    res.json(updatedCrm);
  } catch (error) {
    console.error('Update error:', error);
    res.status(400).json({ message: error.message });
  }
});

app.delete('/api/crm/:id', async (req, res) => {
  try {
    await CRM.findByIdAndDelete(req.params.id);
    res.json({ message: 'CRM deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Add this after your existing routes
app.post('/api/crm/bulk', async (req, res) => {
  try {
    const entries = req.body;
    console.log('Received entries:', entries.length);
    
    // Validate that we received data
    if (!Array.isArray(entries) || entries.length === 0) {
      console.log('Invalid or empty data received');
      return res.status(400).json({ message: 'Invalid data format or empty array' });
    }

    // Log first entry as sample
    console.log('Sample entry:', entries[0]);

    // Try to insert the data
    const savedEntries = await CRM.insertMany(entries, { ordered: false });
    console.log('Successfully saved entries:', savedEntries.length);
    res.status(201).json(savedEntries);
  } catch (error) {
    console.error('Bulk insert error:', error);
    res.status(400).json({ 
      message: error.message,
      code: error.code,
      details: error.writeErrors || error.errors 
    });
  }
});



// Add this function after your mongoose connection but before routes


// Modify your mongoose connection to include loadInitialData
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('Connected to MongoDB Atlas');
    return loadInitialData();
  })
  .then(() => {
    console.log('Initial data load complete');
  })
  .catch(err => console.error('MongoDB Atlas connection error:', err));

// Configure multer for file upload
const storage = multer.diskStorage({
  destination: './uploads/',
  filename: (req, file, cb) => {
    cb(null, 'CRM_data.xlsx');
  }
});

const upload = multer({ storage: storage });

// Add new route for Excel upload
app.post('/api/crm/upload-excel', upload.single('file'), async (req, res) => {
  try {
    const workbook = XLSX.readFile('./uploads/CRM_data.xlsx');
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet);

    const formattedData = jsonData.map((row, index) => ({
      labCode: String(row['Lab Code'] || '').trim(),
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
      orderPlaced: false
    }));

    const savedEntries = await CRM.insertMany(formattedData);
    res.json(savedEntries);
  } catch (error) {
    console.error('Excel upload error:', error);
    res.status(400).json({ message: error.message });
  }
});
async function loadInitialData() {
    try {
      // Check if database is empty
      const count = await CRM.countDocuments();
      console.log('Current document count:', count);
      
      if (count === 0) {
        console.log('Database is empty, loading initial data...');
        const excelPath = path.join(__dirname, 'uploads', 'CRM_data.xlsx');
        console.log('Reading Excel file from:', excelPath);
        
        const workbook = XLSX.readFile(excelPath);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        
        console.log('Excel data parsed, row count:', jsonData.length);
        console.log('Sample first row:', jsonData[0]);
  
        // Format data
        const formattedData = jsonData.map(row => {
            const expiryDateStr = excelDateToString(row['Expiry date']);
            
            return {
              labCode: String(row['Lab Code'] || '').trim().toUpperCase(),
              name: String(row['Name'] || ''),
              expiryDate: expiryDateStr,
              make: String(row['Make'] || ''),
              quantity: String(row['Quantity'] || ''),
              purity: String(row['Purity '] || ''),
              productCode: String(row['Product Code'] || ''),
              casNo: String(row['CAS no.'] || ''),
              section: String(row['Section'] || ''),
              location: String(row['Location'] || ''),
              boxNo: String(row['Box No.'] || ''),
              remarks: String(row['Remarks'] || ''),
              status: isExpired(expiryDateStr) ? 'expired' : 'active',
              orderPlaced: false
            };
          });
  
        // Insert data
        const result = await CRM.insertMany(formattedData);
        console.log(`Successfully loaded ${result.length} records`);
      } else {
        console.log('Database already contains data, skipping initial load');
      }
    } catch (error) {
      console.error('Error loading initial data:', error);
    }
  }

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});