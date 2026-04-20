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
    
    // Add file to FormData
    formData.append('image', {
      uri: uri,
      type: 'image/jpeg',
      name: fileName || 'photo.jpg'
    });

    console.log("Uploading to backend server...");

    // Upload to backend
    const response = await api.post('/api/media/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    if (response.data && response.data.url) {
      console.log("Upload successful");
      return response.data.url;
    } else {
      throw new Error("No URL returned from server");
    }
  } catch (error) {
    console.error("Upload Error:", error.message);
    throw new Error(`Upload failed: ${error.message}`);
  }
};
