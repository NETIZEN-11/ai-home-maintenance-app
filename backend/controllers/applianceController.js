const Appliance = require('../models/Appliance');
const { sendSuccess, sendError } = require('../utils/errorHandler');

// Add appliance
const addAppliance = async (req, res) => {
  try {
    const { name, type, brand, modelNumber, purchaseDate, serviceDate, location, severity, notes } = req.body;

    const applianceData = {
      user: req.user._id,
      name,
      type,
      brand,
      modelNumber,
      purchaseDate,
      serviceDate,
      location,
      severity,
      notes
    };

    // Add image if uploaded
    if (req.file) {
      applianceData.image = `/uploads/${req.file.filename}`;
    }

    const appliance = await Appliance.create(applianceData);

    sendSuccess(res, 201, appliance, 'Appliance added successfully');
  } catch (error) {
    console.error('Add appliance error:', error);
    sendError(res, 500, 'Failed to add appliance', error.message);
  }
};

// Get all appliances for user
const getAppliances = async (req, res) => {
  try {
    const appliances = await Appliance.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .lean();

    sendSuccess(res, 200, appliances, 'Appliances retrieved successfully');
  } catch (error) {
    console.error('Get appliances error:', error);
    sendError(res, 500, 'Failed to retrieve appliances', error.message);
  }
};

// Get single appliance
const getAppliance = async (req, res) => {
  try {
    const appliance = await Appliance.findById(req.params.id).lean();

    if (!appliance) {
      return sendError(res, 404, 'Appliance not found', 'No appliance found with this ID');
    }

    // Check ownership
    if (appliance.user.toString() !== req.user._id.toString()) {
      return sendError(res, 403, 'Access denied', 'You do not have permission to view this appliance');
    }

    sendSuccess(res, 200, appliance, 'Appliance retrieved successfully');
  } catch (error) {
    console.error('Get appliance error:', error);
    sendError(res, 500, 'Failed to retrieve appliance', error.message);
  }
};

// Update appliance
const updateAppliance = async (req, res) => {
  try {
    const appliance = await Appliance.findById(req.params.id);

    if (!appliance) {
      return sendError(res, 404, 'Appliance not found', 'No appliance found with this ID');
    }

    // Check ownership
    if (appliance.user.toString() !== req.user._id.toString()) {
      return sendError(res, 403, 'Access denied', 'You do not have permission to update this appliance');
    }

    // Update fields
    const { name, type, brand, modelNumber, purchaseDate, serviceDate, location, severity, notes } = req.body;
    
    if (name) appliance.name = name;
    if (type) appliance.type = type;
    if (brand) appliance.brand = brand;
    if (modelNumber) appliance.modelNumber = modelNumber;
    if (purchaseDate) appliance.purchaseDate = purchaseDate;
    if (serviceDate) appliance.serviceDate = serviceDate;
    if (location) appliance.location = location;
    if (severity) appliance.severity = severity;
    if (notes) appliance.notes = notes;

    // Update image if uploaded
    if (req.file) {
      appliance.image = `/uploads/${req.file.filename}`;
    }

    await appliance.save();

    sendSuccess(res, 200, appliance, 'Appliance updated successfully');
  } catch (error) {
    console.error('Update appliance error:', error);
    sendError(res, 500, 'Failed to update appliance', error.message);
  }
};

// Delete appliance
const deleteAppliance = async (req, res) => {
  try {
    const appliance = await Appliance.findById(req.params.id);

    if (!appliance) {
      return sendError(res, 404, 'Appliance not found', 'No appliance found with this ID');
    }

    // Check ownership
    if (appliance.user.toString() !== req.user._id.toString()) {
      return sendError(res, 403, 'Access denied', 'You do not have permission to delete this appliance');
    }

    await appliance.deleteOne();

    sendSuccess(res, 200, { id: req.params.id }, 'Appliance deleted successfully');
  } catch (error) {
    console.error('Delete appliance error:', error);
    sendError(res, 500, 'Failed to delete appliance', error.message);
  }
};

module.exports = {
  addAppliance,
  getAppliances,
  getAppliance,
  updateAppliance,
  deleteAppliance
};
