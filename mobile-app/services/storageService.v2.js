
import api from "./api";
import { createClient } from '@supabase/supabase-js';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage as firebaseStorage } from './firebase';
import { Platform } from 'react-native';


const STORAGE_CONFIG = {
  ENABLE_SUPABASE: true,
  ENABLE_FIREBASE: true,
  ENABLE_BACKEND: true,
  MAX_RETRIES: 2,
  RETRY_DELAY: 1000, // 1 second
  TIMEOUT: 30000, // 30 seconds
};

// Initialize Supabase
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

let supabase = null;
if (supabaseUrl && supabaseAnonKey) {
  supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false },
    global: {
      headers: {
        'x-client-info': 'expo-react-native',
      },
    },
  });
}


/**
 * Convert file URI to ArrayBuffer (React Native compatible)
 * This is MORE RELIABLE than blob for React Native
 */
const uriToArrayBuffer = async (uri) => {
  try {
    console.log(' Converting URI to ArrayBuffer...');
    
    const response = await fetch(uri);
    if (!response.ok) {
      throw new Error(`Failed to fetch file: ${response.status} ${response.statusText}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    console.log(' ArrayBuffer created:', arrayBuffer.byteLength, 'bytes');
    
    return arrayBuffer;
  } catch (error) {
    console.error('URI to ArrayBuffer failed:', error);
    throw new Error(`Failed to read file: ${error.message}`);
  }
};

/**
 * Convert file URI to Blob (fallback method)
 */
const uriToBlob = async (uri) => {
  try {
    console.log(' Converting URI to Blob...');
    
    const response = await fetch(uri);
    if (!response.ok) {
      throw new Error(`Failed to fetch file: ${response.status} ${response.statusText}`);
    }
    
    const blob = await response.blob();
    console.log(' Blob created:', blob.type, blob.size, 'bytes');
    
    return blob;
  } catch (error) {
    console.error(' URI to Blob failed:', error);
    throw new Error(`Failed to read file: ${error.message}`);
  }
};

/**
 * Generate unique filename
 */
const generateFileName = (originalName = 'upload.jpg') => {
  const timestamp = Date.now();
  const randomId = Math.random().toString(36).substring(2, 15);
  const extension = originalName.split('.').pop() || 'jpg';
  return `upload-${timestamp}-${randomId}.${extension}`;
};

/**
 * Sleep utility for retry delays
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));



const uploadToSupabaseWithRetry = async (uri, bucket = 'appliance-images', fileName = null, retries = STORAGE_CONFIG.MAX_RETRIES) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(` [Supabase Attempt ${attempt}/${retries}] Starting upload...`);
      
      if (!supabase) {
        throw new Error('Supabase not initialized');
      }

      const finalFileName = fileName || generateFileName();
      const filePath = `uploads/${finalFileName}`;
      
      console.log(' File path:', filePath);
      console.log(' Bucket:', bucket);

      // Method 1: Try ArrayBuffer (more reliable for React Native)
      let uploadData;
      let contentType = 'image/jpeg';
      
      try {
        uploadData = await uriToArrayBuffer(uri);
      } catch (arrayBufferError) {
        console.warn(' ArrayBuffer failed, trying Blob...');
        const blob = await uriToBlob(uri);
        uploadData = blob;
        contentType = blob.type || 'image/jpeg';
      }

      // Upload to Supabase
      console.log(' Uploading to Supabase...');
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(filePath, uploadData, {
          contentType,
          cacheControl: '3600',
          upsert: false,
        });

      if (error) {
        console.error(' Supabase error:', error);
        
        // Check if it's a retryable error
        if (error.message?.includes('Network') || error.message?.includes('timeout')) {
          if (attempt < retries) {
            console.log(` Retrying in ${STORAGE_CONFIG.RETRY_DELAY}ms...`);
            await sleep(STORAGE_CONFIG.RETRY_DELAY);
            continue;
          }
        }
        
        throw new Error(`Supabase: ${error.message}`);
      }

      // Get public URL
      const { data: publicUrlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(filePath);

      if (!publicUrlData?.publicUrl) {
        throw new Error('Failed to get public URL');
      }

      console.log(' Supabase upload successful!');
      console.log(' URL:', publicUrlData.publicUrl);
      return publicUrlData.publicUrl;

    } catch (error) {
      console.error(` Supabase attempt ${attempt} failed:`, error.message);
      
      if (attempt === retries) {
        throw error;
      }
      
      await sleep(STORAGE_CONFIG.RETRY_DELAY * attempt);
    }
  }
  
  throw new Error('Supabase upload failed after all retries');
};



const uploadToFirebaseWithRetry = async (uri, folder = 'appliance-images', fileName = null, retries = STORAGE_CONFIG.MAX_RETRIES) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(` [Firebase Attempt ${attempt}/${retries}] Starting upload...`);
      
      if (!firebaseStorage) {
        throw new Error('Firebase Storage not initialized');
      }

      const finalFileName = fileName || generateFileName();
      const filePath = `${folder}/${finalFileName}`;
      
      console.log(' File path:', filePath);

      // Create storage reference
      const storageRef = ref(firebaseStorage, filePath);

      // Get file data (try ArrayBuffer first, then Blob)
      let uploadData;
      let metadata = { contentType: 'image/jpeg' };
      
      try {
        const arrayBuffer = await uriToArrayBuffer(uri);
        uploadData = new Uint8Array(arrayBuffer);
      } catch (arrayBufferError) {
        console.warn(' ArrayBuffer failed, trying Blob...');
        uploadData = await uriToBlob(uri);
        metadata.contentType = uploadData.type || 'image/jpeg';
      }

      // Upload to Firebase
      console.log(' Uploading to Firebase...');
      const snapshot = await uploadBytes(storageRef, uploadData, metadata);

      // Get download URL
      console.log(' Getting download URL...');
      const downloadURL = await getDownloadURL(snapshot.ref);

      console.log(' Firebase upload successful!');
      console.log(' URL:', downloadURL);
      return downloadURL;

    } catch (error) {
      console.error(` Firebase attempt ${attempt} failed:`, error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      
      // Check if it's a retryable error
      if (error.code === 'storage/retry-limit-exceeded' || error.message?.includes('Network')) {
        if (attempt < retries) {
          console.log(` Retrying in ${STORAGE_CONFIG.RETRY_DELAY}ms...`);
          await sleep(STORAGE_CONFIG.RETRY_DELAY * attempt);
          continue;
        }
      }
      
      if (attempt === retries) {
        throw new Error(`Firebase: ${error.message || error.code}`);
      }
    }
  }
  
  throw new Error('Firebase upload failed after all retries');
};


const uploadToBackend = async (uri, fileName = 'file.jpg') => {
  try {
    console.log(' [Backend] Starting upload...');
    
    const formData = new FormData();
    formData.append('media', {
      uri: uri,
      type: 'image/jpeg',
      name: fileName || 'photo.jpg'
    });

    const response = await api.post('/api/media', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      timeout: STORAGE_CONFIG.TIMEOUT,
    });

    if (response.data?.data?.fileUrl) {
      console.log(' Backend upload successful!');
      console.log(' URL:', response.data.data.fileUrl);
      return response.data.data.fileUrl;
    }
    
    throw new Error('Invalid response from backend');
  } catch (error) {
    console.error(' Backend upload failed:', error.message);
    throw new Error(`Backend: ${error.message}`);
  }
};


/**
 * Upload file with triple fallback strategy
 * @param {string} uri - File URI from React Native
 * @param {string} fileName - Optional custom filename
 * @param {Object} options - Upload options
 * @returns {Promise<string>} - Public URL of uploaded file
 */
export const uploadFile = async (uri, fileName = null, options = {}) => {
  const {
    forceBackend = false,
    bucket = 'appliance-images',
    folder = 'appliance-images',
  } = options;

  if (!uri) {
    throw new Error('No file URI provided');
  }

  console.log(' ============================================');
  console.log(' STARTING FILE UPLOAD');
  console.log(' URI:', uri.substring(0, 60) + '...');
  console.log(' ============================================');

  const errors = [];

  // Skip cloud storage if forced to backend
  if (forceBackend) {
    console.log(' Skipping cloud storage (forced backend)');
    return await uploadToBackend(uri, fileName);
  }

  // STRATEGY 1: Try Supabase
  if (STORAGE_CONFIG.ENABLE_SUPABASE) {
    try {
      console.log('\n [1/3] ATTEMPTING SUPABASE STORAGE');
      const url = await uploadToSupabaseWithRetry(uri, bucket, fileName);
      console.log(' SUCCESS: Uploaded to Supabase');
      return url;
    } catch (error) {
      console.error(' FAILED: Supabase upload');
      console.error('   Reason:', error.message);
      errors.push({ service: 'Supabase', error: error.message });
    }
  } else {
    console.log('\n [1/3] SKIPPING SUPABASE (disabled)');
  }

  // STRATEGY 2: Try Firebase
  if (STORAGE_CONFIG.ENABLE_FIREBASE) {
    try {
      console.log('\n [2/3] ATTEMPTING FIREBASE STORAGE');
      const url = await uploadToFirebaseWithRetry(uri, folder, fileName);
      console.log(' SUCCESS: Uploaded to Firebase');
      return url;
    } catch (error) {
      console.error(' FAILED: Firebase upload');
      console.error('   Reason:', error.message);
      errors.push({ service: 'Firebase', error: error.message });
    }
  } else {
    console.log('\n [2/3] SKIPPING FIREBASE (disabled)');
  }

  // STRATEGY 3: Backend fallback
  if (STORAGE_CONFIG.ENABLE_BACKEND) {
    try {
      console.log('\n [3/3] ATTEMPTING BACKEND STORAGE (FALLBACK)');
      const url = await uploadToBackend(uri, fileName);
      console.log(' SUCCESS: Uploaded to Backend');
      return url;
    } catch (error) {
      console.error(' FAILED: Backend upload');
      console.error('   Reason:', error.message);
      errors.push({ service: 'Backend', error: error.message });
    }
  }

  // All strategies failed
  console.error('\n ============================================');
  console.error(' ALL UPLOAD STRATEGIES FAILED');
  console.error(' ============================================');
  errors.forEach(({ service, error }) => {
    console.error(`   ${service}: ${error}`);
  });
  
  throw new Error(`Upload failed on all services: ${errors.map(e => e.service).join(', ')}`);
};


// EXPORTS
export default {
  uploadFile,
  uploadToSupabaseWithRetry,
  uploadToFirebaseWithRetry,
  uploadToBackend,
};
