// Triple fallback: Supabase → Firebase → Backend

import api from "./api";
import { createClient } from '@supabase/supabase-js';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage as firebaseStorage } from './firebase';

// CONFIGURATION

const STORAGE_CONFIG = {
  ENABLE_SUPABASE: true,
  ENABLE_FIREBASE: true,
  ENABLE_BACKEND: true,
  SUPABASE_BUCKET: 'images',
  FIREBASE_FOLDER: 'appliance-images',
  MAX_RETRIES: 2,
  RETRY_DELAY: 1000,
};

// Initialize Supabase
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

let supabase = null;
if (supabaseUrl && supabaseAnonKey) {
  supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false },
  });
  console.log('Supabase initialized');
}


const uriToUint8Array = async (uri) => {
  try {
    console.log('Converting URI to Uint8Array...');
    
    // Fetch file as ArrayBuffer
    const response = await fetch(uri);
    if (!response.ok) {
      throw new Error(`Fetch failed: ${response.status} ${response.statusText}`);
    }
    
    // Convert to ArrayBuffer then Uint8Array
    const arrayBuffer = await response.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    console.log('Uint8Array created:', uint8Array.byteLength, 'bytes');
    return uint8Array;
    
  } catch (error) {
    console.error('URI conversion failed:', error);
    throw new Error(`Failed to read file: ${error.message}`);
  }
};

/**
 * Get file extension from URI
 */
const getFileExtension = (uri) => {
  // Handle both file:// URIs and regular paths
  const cleanUri = uri.split('?')[0]; // Remove query params
  const match = cleanUri.match(/\.([a-zA-Z0-9]+)$/);
  return match ? match[1].toLowerCase() : 'jpg';
};

/**
 * Get MIME type from extension
 */
const getMimeType = (extension) => {
  const mimeTypes = {
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'gif': 'image/gif',
    'webp': 'image/webp',
    'heic': 'image/heic',
    'mp4': 'video/mp4',
    'mov': 'video/quicktime',
    'pdf': 'application/pdf',
  };
  return mimeTypes[extension] || 'application/octet-stream';
};

/**
 * Generate unique filename with correct extension
 */
const generateFileName = (uri, customName = null) => {
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(2, 15); // Longer random ID
  const extension = getFileExtension(uri);
  
  // If custom name provided, use it as prefix
  if (customName) {
    const nameWithoutExt = customName.replace(/\.[^/.]+$/, '');
    return `${nameWithoutExt}-${timestamp}-${randomId}.${extension}`;
  }
  
  return `upload-${timestamp}-${randomId}.${extension}`;
};

/**
 * Sleep utility for retry delays
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));



const uploadToSupabase = async (uri, fileName = null) => {
  const bucket = STORAGE_CONFIG.SUPABASE_BUCKET;
  
  for (let attempt = 1; attempt <= STORAGE_CONFIG.MAX_RETRIES; attempt++) {
    try {
      console.log(`[Supabase ${attempt}/${STORAGE_CONFIG.MAX_RETRIES}] Starting...`);
      
      if (!supabase) {
        throw new Error('Supabase not initialized');
      }

      // Generate filename and get file info
      const finalFileName = fileName ? generateFileName(uri, fileName) : generateFileName(uri);
      const filePath = `uploads/${finalFileName}`;
      const extension = getFileExtension(uri);
      const contentType = getMimeType(extension);
      
      console.log('Bucket:', bucket);
      console.log('Path:', filePath);
      console.log('Type:', contentType);

      // CRITICAL FIX: Use Uint8Array instead of Blob
      const uint8Array = await uriToUint8Array(uri);

      // Upload to Supabase using Uint8Array
      console.log('Uploading to Supabase...');
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(filePath, uint8Array, {
          contentType: contentType,
          cacheControl: '3600',
          upsert: true, // FIXED: Allow overwriting existing files
        });

      if (error) {
        console.error('Supabase error:', error.message);
        console.error('Error details:', JSON.stringify(error, null, 2));
        
        // Retry on network/timeout errors
        const isRetryable = 
          error.message?.includes('Network') ||
          error.message?.includes('timeout') ||
          error.message?.includes('ECONNRESET');
          
        if (isRetryable && attempt < STORAGE_CONFIG.MAX_RETRIES) {
          console.log(`Retrying in ${STORAGE_CONFIG.RETRY_DELAY * attempt}ms...`);
          await sleep(STORAGE_CONFIG.RETRY_DELAY * attempt);
          continue;
        }
        
        throw new Error(error.message);
      }

      // Get public URL
      console.log('Getting public URL...');
      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);

      if (!urlData?.publicUrl) {
        throw new Error('Failed to get public URL from Supabase');
      }

      console.log('Supabase upload successful!');
      console.log('URL:', urlData.publicUrl);
      return urlData.publicUrl;

    } catch (error) {
      console.error(`Supabase attempt ${attempt} failed:`, error.message);
      
      if (attempt === STORAGE_CONFIG.MAX_RETRIES) {
        throw error;
      }
      
      await sleep(STORAGE_CONFIG.RETRY_DELAY * attempt);
    }
  }
  
  throw new Error('Supabase upload failed after all retries');
};



const uploadToFirebase = async (uri, fileName = null) => {
  const folder = STORAGE_CONFIG.FIREBASE_FOLDER;
  
  for (let attempt = 1; attempt <= STORAGE_CONFIG.MAX_RETRIES; attempt++) {
    try {
      console.log(`[Firebase ${attempt}/${STORAGE_CONFIG.MAX_RETRIES}] Starting...`);
      
      if (!firebaseStorage) {
        throw new Error('Firebase Storage not initialized');
      }

      const finalFileName = fileName ? generateFileName(uri, fileName) : generateFileName(uri);
      const filePath = `${folder}/${finalFileName}`;
      const extension = getFileExtension(uri);
      const contentType = getMimeType(extension);
      
      console.log('Path:', filePath);
      console.log('Type:', contentType);

      // FIXED: Use fetch response directly for React Native compatibility
      console.log('Fetching file...');
      const response = await fetch(uri);
      if (!response.ok) {
        throw new Error(`Fetch failed: ${response.status}`);
      }
      
      // Get blob from response (React Native compatible)
      const blob = await response.blob();
      console.log('Blob created:', blob.size, 'bytes');

      // Create reference and upload
      console.log('Uploading to Firebase...');
      const storageRef = ref(firebaseStorage, filePath);
      const snapshot = await uploadBytes(storageRef, blob, {
        contentType: contentType,
      });

      // Get download URL
      console.log('Getting download URL...');
      const downloadURL = await getDownloadURL(snapshot.ref);

      console.log('Firebase upload successful!');
      console.log('URL:', downloadURL);
      return downloadURL;

    } catch (error) {
      console.error(`Firebase attempt ${attempt} failed:`, error.code || error.message);
      
      if (attempt === STORAGE_CONFIG.MAX_RETRIES) {
        throw error;
      }
      
      await sleep(STORAGE_CONFIG.RETRY_DELAY * attempt);
    }
  }
  
  throw new Error('Firebase upload failed after all retries');
};


const uploadToBackend = async (uri, fileName = 'file.jpg') => {
  try {
    console.log('[Backend] Starting upload...');
    
    const formData = new FormData();
    formData.append('media', {
      uri: uri,
      type: 'image/jpeg',
      name: fileName,
    });

    const response = await api.post('/api/media', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    if (response.data?.data?.fileUrl) {
      console.log('Backend upload successful!');
      console.log('URL:', response.data.data.fileUrl);
      return response.data.data.fileUrl;
    }
    
    throw new Error('Invalid backend response');
  } catch (error) {
    throw new Error(`Backend: ${error.message}`);
  }
};


// MAIN UPLOAD FUNCTION WITH TRIPLE FALLBACK


/**
 * Upload file with triple fallback strategy
 * @param {string} uri - File URI from React Native (file://...)
 * @param {string} fileName - Optional custom filename
 * @param {boolean} forceBackend - Skip cloud storage
 * @returns {Promise<string>} - Public URL of uploaded file
 */
export const uploadFile = async (uri, fileName = null, forceBackend = false) => {
  if (!uri) {
    throw new Error('No file URI provided');
  }

  console.log('\n========================================');
  console.log('STARTING FILE UPLOAD');
  console.log('URI:', uri.substring(0, 60) + '...');
  console.log('========================================\n');

  if (forceBackend) {
    console.log('Skipping cloud storage (forced backend)');
    return await uploadToBackend(uri, fileName);
  }

  const errors = [];

  // STRATEGY 1: Try Supabase (Primary)
  if (STORAGE_CONFIG.ENABLE_SUPABASE) {
    try {
      console.log('[1/3] ATTEMPTING SUPABASE STORAGE');
      const url = await uploadToSupabase(uri, fileName);
      console.log('SUCCESS: Uploaded to Supabase\n');
      return url;
    } catch (error) {
      console.error('FAILED: Supabase upload');
      console.error('Reason:', error.message);
      errors.push({ service: 'Supabase', error: error.message });
    }
  } else {
    console.log('[1/3] SKIPPING SUPABASE (disabled)\n');
  }

  // STRATEGY 2: Try Firebase (Secondary)
  if (STORAGE_CONFIG.ENABLE_FIREBASE) {
    try {
      console.log('[2/3] ATTEMPTING FIREBASE STORAGE');
      const url = await uploadToFirebase(uri, fileName);
      console.log('SUCCESS: Uploaded to Firebase\n');
      return url;
    } catch (error) {
      console.error('FAILED: Firebase upload');
      console.error('Reason:', error.message);
      errors.push({ service: 'Firebase', error: error.message });
    }
  } else {
    console.log('[2/3] SKIPPING FIREBASE (disabled)\n');
  }

  // STRATEGY 3: Backend fallback (Last resort)
  if (STORAGE_CONFIG.ENABLE_BACKEND) {
    try {
      console.log('[3/3] ATTEMPTING BACKEND STORAGE (FALLBACK)');
      const url = await uploadToBackend(uri, fileName);
      console.log('SUCCESS: Uploaded to Backend\n');
      return url;
    } catch (error) {
      console.error('FAILED: Backend upload');
      console.error('Reason:', error.message);
      errors.push({ service: 'Backend', error: error.message });
    }
  }

  // All strategies failed
  console.error('\n========================================');
  console.error('ALL UPLOAD STRATEGIES FAILED');
  console.error('========================================');
  errors.forEach(({ service, error }) => {
    console.error(`${service}: ${error}`);
  });
  
  throw new Error(`Upload failed on all services: ${errors.map(e => `${e.service} (${e.error})`).join('; ')}`);
};


// EXPORTS
export default { uploadFile };
export { uploadToSupabase, uploadToFirebase, uploadToBackend };
