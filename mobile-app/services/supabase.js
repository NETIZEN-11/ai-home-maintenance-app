import { createClient } from '@supabase/supabase-js';

// Supabase configuration from environment variables
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

// Check if Supabase is properly configured
const isConfigured = 
  supabaseUrl && 
  supabaseAnonKey &&
  !supabaseUrl.includes('your-') && 
  !supabaseAnonKey.includes('your-') &&
  supabaseUrl.startsWith('https://');

if (!isConfigured) {
  console.warn('Supabase not properly configured');
  console.warn('Get your config from: https://supabase.com/dashboard');
}

// Initialize Supabase client
let supabase = null;

try {
  if (isConfigured) {
    supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false, // We're using Firebase for auth
      },
    });
    console.log('Supabase initialized successfully');
  }
} catch (error) {
  console.error('Supabase initialization error:', error.message);
}

/**
 * Upload file to Supabase Storage
 * @param {string} uri - File URI (local path or blob)
 * @param {string} bucket - Storage bucket name (default: 'appliance-images')
 * @param {string} fileName - Custom file name (optional)
 * @returns {Promise<string>} - Public URL of uploaded file
 */
export const uploadToSupabase = async (uri, bucket = 'appliance-images', fileName = null) => {
  try {
    if (!supabase) {
      throw new Error('Supabase not initialized. Check your configuration.');
    }

    if (!uri) {
      throw new Error('No file URI provided');
    }

    console.log('Uploading to Supabase Storage...');

    // Generate unique filename if not provided
    const timestamp = Date.now();
    const randomId = Math.random().toString(36).substring(7);
    const finalFileName = fileName || `upload-${timestamp}-${randomId}.jpg`;
    const filePath = `uploads/${finalFileName}`;

    console.log('File path:', filePath);
    console.log('Bucket:', bucket);

    // Fetch the file as blob (works for both web and native)
    let blob;
    try {
      const response = await fetch(uri);
      if (!response.ok) {
        throw new Error(`Failed to fetch file: ${response.status}`);
      }
      blob = await response.blob();
      console.log('Blob created:', blob.type, blob.size, 'bytes');
    } catch (fetchError) {
      console.error('Fetch error:', fetchError.message);
      throw new Error(`Failed to read file: ${fetchError.message}`);
    }

    // Upload to Supabase Storage
    console.log('Uploading to Supabase...');
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filePath, blob, {
        contentType: blob.type || 'image/jpeg',
        cacheControl: '3600',
        upsert: false, // Don't overwrite existing files
      });

    if (error) {
      console.error('Supabase upload error:', error);
      
      // Check for common errors
      if (error.message?.includes('Bucket not found')) {
        throw new Error('Supabase bucket "appliance-images" does not exist. Please create it in Supabase dashboard.');
      } else if (error.message?.includes('not allowed')) {
        throw new Error('Supabase storage access denied. Check bucket permissions.');
      } else if (error.message?.includes('Network')) {
        throw new Error('Network error connecting to Supabase. Check internet connection.');
      }
      
      throw new Error(`Supabase upload failed: ${error.message}`);
    }

    console.log('Upload successful, getting public URL...');

    // Get public URL
    const { data: publicUrlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(filePath);

    if (!publicUrlData || !publicUrlData.publicUrl) {
      throw new Error('Failed to get public URL from Supabase');
    }

    console.log('Public URL:', publicUrlData.publicUrl);
    return publicUrlData.publicUrl;

  } catch (error) {
    console.error('Upload to Supabase failed:', error.message);
    throw error;
  }
};

/**
 * Delete file from Supabase Storage
 * @param {string} fileUrl - Public URL of the file
 * @param {string} bucket - Storage bucket name
 * @returns {Promise<boolean>} - Success status
 */
export const deleteFromSupabase = async (fileUrl, bucket = 'appliance-images') => {
  try {
    if (!supabase) {
      throw new Error('Supabase not initialized');
    }

    // Extract file path from URL
    const urlParts = fileUrl.split(`${bucket}/`);
    if (urlParts.length < 2) {
      throw new Error('Invalid file URL format');
    }
    const filePath = urlParts[1];

    const { error } = await supabase.storage
      .from(bucket)
      .remove([filePath]);

    if (error) {
      console.error('Delete error:', error);
      return false;
    }

    console.log('File deleted successfully');
    return true;

  } catch (error) {
    console.error('Delete from Supabase failed:', error.message);
    return false;
  }
};

/**
 * List all files in a bucket
 * @param {string} bucket - Storage bucket name
 * @param {string} folder - Folder path (optional)
 * @returns {Promise<Array>} - List of files
 */
export const listSupabaseFiles = async (bucket = 'appliance-images', folder = 'uploads') => {
  try {
    if (!supabase) {
      throw new Error('Supabase not initialized');
    }

    const { data, error } = await supabase.storage
      .from(bucket)
      .list(folder, {
        limit: 100,
        offset: 0,
        sortBy: { column: 'created_at', order: 'desc' },
      });

    if (error) {
      console.error('List files error:', error);
      return [];
    }

    return data || [];

  } catch (error) {
    console.error('List files failed:', error.message);
    return [];
  }
};

export { supabase };
export default supabase;
