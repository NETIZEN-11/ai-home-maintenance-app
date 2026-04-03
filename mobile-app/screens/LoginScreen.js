import React, { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform, ScrollView
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { auth } from "../services/firebase";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import { Colors, Spacing, Radius, Shadow, FontSize } from "../constants/theme";

export default function LoginScreen({ navigation }) {
  const { saveToken } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState(null);

  const isValidEmail = (e) => /\S+@\S+\.\S+/.test(e);

  const handleLogin = async () => {
    if (!email || !password)
      return Alert.alert("Missing Fields", "Please enter email and password");
    if (!isValidEmail(email))
      return Alert.alert("Invalid Email", "Enter a valid email address");

    try {
      setLoading(true);

      // Step 1: Login to backend first to get JWT token
      let backendToken = null;
      try {
        console.log("Logging in to backend...");
        const backendRes = await api.post("/api/auth/login", { email, password });
        if (backendRes.data?.data?.token) {
          backendToken = backendRes.data.data.token;
          await saveToken(backendToken);
          console.log("Backend token saved");
        }
      } catch (backendErr) {
        console.error("Backend login failed:", backendErr.message);
        
        // If user doesn't exist in backend, offer to create account
        if (backendErr.message?.includes('Invalid email or password') || 
            backendErr.message?.includes('Login failed')) {
          console.log("User not found in backend, will prompt to sync account");
        }
      }

      // Step 2: Firebase auth
      console.log("Logging in to Firebase...");
      const firebaseUser = await signInWithEmailAndPassword(auth, email, password);
      console.log("Firebase login complete");

      // Step 3: If no backend token, show sync option
      if (!backendToken) {
        Alert.alert(
          "Account Sync Required",
          "Your account needs to be synced with the backend for AI features. Please logout and register again with the same email.",
          [
            { 
              text: "LATER", 
              onPress: () => navigation.replace("Home"),
              style: "cancel" 
            },
            { 
              text: "LOGOUT & REGISTER", 
              onPress: async () => {
                try {
                  await signOut(auth);
                  await clearToken();
                  navigation.replace("Register");
                  setTimeout(() => {
                    Alert.alert(
                      "Register Again",
                      "Please register with your email: " + email,
                      [{ text: "OK" }]
                    );
                  }, 500);
                } catch (err) {
                  console.error("Logout error:", err);
                  navigation.replace("Register");
                }
              }
            }
          ]
        );
        return; // Don't navigate yet
      }

      navigation.replace("Home");
    } catch (error) {
      let msg = "Login failed. Please try again.";
      if (error.code === "auth/user-not-found") msg = "No account found with this email";
      else if (error.code === "auth/wrong-password") msg = "Incorrect password";
      else if (error.code === "auth/invalid-credential") msg = "Invalid credentials";
      else if (error.code === "auth/too-many-requests") msg = "Too many login attempts. Try again later.";
      else if (error.message) msg = error.message;
      Alert.alert("Login Failed", msg);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!email) return Alert.alert("Enter Email", "Please enter your email first");
    try {
      await sendPasswordResetEmail(auth, email);
      Alert.alert("Email Sent", "Password reset link sent to your inbox");
    } catch (error) {
      Alert.alert("Error", error.message);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {/* Logo */}
        <View style={styles.logoContainer}>
          <View style={styles.logoCircle}>
            <MaterialCommunityIcons name="home-lightning-bolt" size={40} color={Colors.white} />
          </View>
          <Text style={styles.appName}>AI Home Assistant</Text>
          <Text style={styles.tagline}>Smart maintenance, simplified</Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          <Text style={styles.title}>Welcome back</Text>
          <Text style={styles.subtitle}>Sign in to your account</Text>

          {/* Email */}
          <View style={styles.fieldLabel}>
            <Text style={styles.label}>Email</Text>
          </View>
          <View style={[styles.inputBox, focusedField === "email" && styles.inputFocused]}>
            <Ionicons name="mail-outline" size={18} color={focusedField === "email" ? Colors.primary : Colors.gray500} />
            <TextInput
              style={styles.input}
              placeholder="you@example.com"
              placeholderTextColor={Colors.gray400}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              onFocus={() => setFocusedField("email")}
              onBlur={() => setFocusedField(null)}
            />
          </View>

          {/* Password */}
          <View style={[styles.fieldLabel, { marginTop: Spacing.md }]}>
            <Text style={styles.label}>Password</Text>
            <TouchableOpacity onPress={handleResetPassword}>
              <Text style={styles.forgotText}>Forgot password?</Text>
            </TouchableOpacity>
          </View>
          <View style={[styles.inputBox, focusedField === "password" && styles.inputFocused]}>
            <Ionicons name="lock-closed-outline" size={18} color={focusedField === "password" ? Colors.primary : Colors.gray500} />
            <TextInput
              style={styles.input}
              placeholder="Enter your password"
              placeholderTextColor={Colors.gray400}
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
              onFocus={() => setFocusedField("password")}
              onBlur={() => setFocusedField(null)}
            />
            <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
              <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={18} color={Colors.gray500} />
            </TouchableOpacity>
          </View>

          {/* Login Button */}
          <TouchableOpacity
            style={[styles.loginBtn, loading && styles.loginBtnDisabled]}
            onPress={handleLogin}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <ActivityIndicator color={Colors.white} />
                <Text style={styles.loginBtnText}>Signing in...</Text>
              </View>
            ) : (
              <>
                <Text style={styles.loginBtnText}>Sign In</Text>
                <Ionicons name="arrow-forward" size={18} color={Colors.white} />
              </>
            )}
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Sign Up */}
          <TouchableOpacity
            style={styles.signupBtn}
            onPress={() => navigation.navigate("Register")}
            activeOpacity={0.8}
          >
            <Text style={styles.signupBtnText}>Create an account</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.footer}>
          By signing in, you agree to our Terms & Privacy Policy
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { flexGrow: 1, paddingVertical: Spacing.xl, padding: Spacing.lg },
  logoContainer: { alignItems: "center", marginBottom: Spacing.xl },
  logoCircle: {
    width: 80, height: 80, borderRadius: Radius.xl,
    backgroundColor: Colors.primary, justifyContent: "center",
    alignItems: "center", marginBottom: Spacing.md, ...Shadow.lg,
  },
  appName: { fontSize: FontSize.xxl, fontWeight: "700", color: Colors.text, letterSpacing: -0.5 },
  tagline: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 4 },
  card: {
    backgroundColor: Colors.white, borderRadius: Radius.xl,
    padding: Spacing.lg, ...Shadow.md,
  },
  title: { fontSize: FontSize.xl, fontWeight: "700", color: Colors.text },
  subtitle: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 4, marginBottom: Spacing.lg },
  fieldLabel: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: Spacing.xs },
  label: { fontSize: FontSize.sm, fontWeight: "600", color: Colors.gray700 },
  forgotText: { fontSize: FontSize.sm, color: Colors.primary, fontWeight: "500" },
  inputBox: {
    flexDirection: "row", alignItems: "center", backgroundColor: Colors.gray100,
    borderRadius: Radius.md, paddingHorizontal: Spacing.md, paddingVertical: 2,
    borderWidth: 1.5, borderColor: Colors.border,
  },
  inputFocused: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  input: { flex: 1, paddingVertical: 13, paddingHorizontal: Spacing.sm, fontSize: FontSize.md, color: Colors.text },
  loginBtn: {
    flexDirection: "row", backgroundColor: Colors.primary, borderRadius: Radius.md,
    padding: 15, alignItems: "center", justifyContent: "center",
    marginTop: Spacing.lg, gap: 8, ...Shadow.lg,
  },
  loginBtnDisabled: { opacity: 0.7 },
  loginBtnText: { color: Colors.white, fontWeight: "700", fontSize: FontSize.md },
  divider: { flexDirection: "row", alignItems: "center", marginVertical: Spacing.md },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.border },
  dividerText: { marginHorizontal: Spacing.sm, color: Colors.gray500, fontSize: FontSize.sm },
  signupBtn: {
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: Radius.md,
    padding: 14, alignItems: "center",
  },
  signupBtnText: { color: Colors.text, fontWeight: "600", fontSize: FontSize.md },
  footer: { textAlign: "center", color: Colors.gray500, fontSize: FontSize.xs, marginTop: Spacing.lg },
});
