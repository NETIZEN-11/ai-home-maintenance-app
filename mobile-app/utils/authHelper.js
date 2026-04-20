import { auth } from "../services/firebase";
import api from "../services/api";

/**
 * Ensures user has a valid backend token
 * Call this before making authenticated API requests
 */
export const ensureBackendToken = async (saveToken) => {
  try {
    const currentUser = auth.currentUser;
    
    if (!currentUser) {
      throw new Error("No user logged in");
    }

    // Try to get backend token by logging in with Firebase credentials
    // This requires the user's email, but we don't have password
    // So we'll need to handle this differently
    
    console.log("Checking backend token...");
    
    // Test if current token works
    try {
      await api.get("/api/appliances");
      console.log("Token is valid");
      return true;
    } catch (error) {
      if (error.message.includes("Not authorized")) {
        console.log("Token is invalid or missing");
        return false;
      }
      throw error;
    }
  } catch (error) {
    console.error("Token check failed:", error);
    return false;
  }
};

/**
 * Check if user needs to re-authenticate
 */
export const needsReauth = (error) => {
  return error?.message?.includes("Not authorized") || 
         error?.message?.includes("Invalid token") ||
         error?.message?.includes("No token");
};
