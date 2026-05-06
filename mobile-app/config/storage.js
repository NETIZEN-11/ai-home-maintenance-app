/**
 * Storage Configuration
 * Configure upload strategy and fallback order
 */

export const STORAGE_CONFIG = {
  // Primary storage provider
  PRIMARY: 'supabase', // Options: 'supabase', 'firebase', 'backend'
  
  // Enable/Disable specific storage providers
  ENABLE_SUPABASE: true,   //  Enabled (will try first)
  ENABLE_FIREBASE: true,   //  Enabled (will try second)
  ENABLE_BACKEND: true,    //  Enabled (fallback)
  
  // Enable automatic fallback to other providers
  ENABLE_FALLBACK: true,
  
  // Fallback order (will try in sequence, skipping disabled ones)
  FALLBACK_ORDER: ['supabase', 'firebase', 'backend'],
  
  // Storage bucket names
  BUCKETS: {
    APPLIANCE_IMAGES: 'appliance-images',
    USER_UPLOADS: 'user-uploads',
    REPORTS: 'reports',
  },
  
  // File size limits (in bytes)
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
  
  // Allowed file types
  ALLOWED_TYPES: {
    IMAGES: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
    VIDEOS: ['video/mp4', 'video/quicktime'],
    DOCUMENTS: ['application/pdf'],
  },
  
  // Cache settings
  CACHE_CONTROL: '3600', // 1 hour
  
  // Retry settings
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000, // 1 second
  
  // Debug mode
  DEBUG: true, // Set to false in production
};

/**
 * Get storage provider status
 */
export const getStorageStatus = () => {
  return {
    supabase: {
      configured: !!process.env.EXPO_PUBLIC_SUPABASE_URL,
      active: true,
      priority: 1,
    },
    firebase: {
      configured: !!process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
      active: true,
      priority: 2,
    },
    backend: {
      configured: !!process.env.EXPO_PUBLIC_API_URL,
      active: true,
      priority: 3,
    },
  };
};

/**
 * Validate file before upload
 */
export const validateFile = (file, type = 'image') => {
  const allowedTypes = STORAGE_CONFIG.ALLOWED_TYPES[type.toUpperCase()] || [];
  
  // Check file size
  if (file.size && file.size > STORAGE_CONFIG.MAX_FILE_SIZE) {
    throw new Error(`File size exceeds ${STORAGE_CONFIG.MAX_FILE_SIZE / 1024 / 1024}MB limit`);
  }
  
  // Check file type
  if (file.type && !allowedTypes.includes(file.type)) {
    throw new Error(`File type ${file.type} not allowed`);
  }
  
  return true;
};

export default STORAGE_CONFIG;
