import api from "./api";

/**
 * Upload image to backend server
 * Uses FormData for multipart upload
 */
export const uploadFile = async (uri, fileName = "file.jpg") => {
  try {
    if (!uri) {
      throw new Error("No file URI provided");
    }

    console.log("Preparing file for upload:", uri.substring(0, 50));
    
    // Create FormData
    const formData = new FormData();
    
    // Add file to FormData - backend expects field name 'media'
    formData.append('media', {
      uri: uri,
      type: 'image/jpeg',
      name: fileName || 'photo.jpg'
    });

    console.log("Uploading to backend server...");

    // Upload to backend - endpoint is /api/media/
    const response = await api.post('/api/media', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    // Backend returns { success: true, data: { fileUrl: ... } }
    if (response.data && response.data.data && response.data.data.fileUrl) {
      console.log("Upload successful");
      return response.data.data.fileUrl;
    } else {
      throw new Error("Invalid response format from server");
    }
  } catch (error) {
    console.error("Upload Error:", error.message);
    throw new Error(`Upload failed: ${error.message}`);
  }
};
