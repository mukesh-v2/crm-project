import express from 'express';
import cors from 'cors';
import connectDB from './db';
import CrmEntry from './models/CrmEntry';

const app = express();
app.use(cors());
app.use(express.json());

connectDB();

// Get all CRM entries
app.get('/api/crm', async (req, res) => {
  try {
    const entries = await CrmEntry.find();
    res.json(entries);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Create new CRM entry
app.post('/api/crm', async (req, res) => {
  try {
    const entry = new CrmEntry(req.body);
    await entry.save();
    res.json(entry);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Update CRM entry
app.put('/api/crm/:id', async (req, res) => {
  try {
    const entry = await CrmEntry.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(entry);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete CRM entry
app.delete('/api/crm/:id', async (req, res) => {
  try {
    await CrmEntry.findByIdAndDelete(req.params.id);
    res.json({ message: 'Entry deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));