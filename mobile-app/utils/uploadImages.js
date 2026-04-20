import { uploadFile } from "../services/storageService";

// Wrapper around backend storage upload
export const uploadImage = async (uri) => {
  try {
    const url = await uploadFile(uri, "image.jpg");
    return url;
  } catch (err) {
    console.log("Upload Error:", err.message);
    return null;
  }
};
