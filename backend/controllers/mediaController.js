const MediaReport = require('../models/MediaReport');
const { sendSuccess, sendError } = require('../utils/errorHandler');

// Upload media
const uploadMedia = async (req, res) => {
  try {
    if (!req.file) {
      return sendError(res, 400, 'Validation error', 'No file uploaded');
    }

    const { applianceId, description } = req.body;

    // Determine media type
    let mediaType = 'document';
    if (req.file.mimetype.startsWith('image/')) {
      mediaType = 'image';
    } else if (req.file.mimetype.startsWith('video/')) {
      mediaType = 'video';
    }

    const mediaReport = await MediaReport.create({
      user: req.user._id,
      appliance: applianceId || null,
      mediaType,
      fileUrl: `/uploads/${req.file.filename}`,
      description
    });

    sendSuccess(res, 201, mediaReport, 'Media uploaded successfully');
  } catch (error) {
    console.error('Upload media error:', error);
    sendError(res, 500, 'Failed to upload media', error.message);
  }
};

module.exports = {
  uploadMedia
};
