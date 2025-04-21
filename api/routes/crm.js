const router = require('express').Router();
const CRM = require('../models/crm');

// Get all CRMs
router.get('/', async (req, res) => {
  try {
    const crms = await CRM.find();
    res.json(crms);
  } catch (err) {
    res.status(400).json('Error: ' + err);
  }
});

// Add new CRM
router.post('/', async (req, res) => {
  try {
    const newCRM = new CRM(req.body);
    const savedCRM = await newCRM.save();
    res.json(savedCRM);
  } catch (err) {
    res.status(400).json('Error: ' + err);
  }
});

// Bulk create CRMs
router.post('/bulk', async (req, res) => {
  try {
    const crms = await CRM.insertMany(req.body);
    res.json(crms);
  } catch (err) {
    res.status(400).json('Error: ' + err);
  }
});

// Update CRM
router.put('/:id', async (req, res) => {
  try {
    const updatedCRM = await CRM.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updatedCRM);
  } catch (err) {
    res.status(400).json('Error: ' + err);
  }
});

// Delete CRM
router.delete('/:id', async (req, res) => {
  try {
    await CRM.findByIdAndDelete(req.params.id);
    res.json('CRM deleted.');
  } catch (err) {
    res.status(400).json('Error: ' + err);
  }
});

module.exports = router;