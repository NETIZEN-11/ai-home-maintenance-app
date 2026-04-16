import { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { auth } from "../services/firebase";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import { Colors, Spacing, Radius, Shadow, FontSize } from "../constants/theme";

export default function RegisterScreen({ navigation }) {
  const { saveToken } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState(null);

  const isValidEmail = (e) => /\S+@\S+\.\S+/.test(e);

  const handleSignup = async () => {
    if (!name || !email || !password || !confirmPassword)
      return Alert.alert("Missing Fields", "Please fill all fields");
    if (!isValidEmail(email)) return Alert.alert("Invalid Email", "Enter a valid email");
    if (name.trim().length < 2) return Alert.alert("Invalid Name", "Name must be at least 2 characters");
    if (password.length < 6) return Alert.alert("Weak Password", "Minimum 6 characters required");
    if (!/[a-zA-Z]/.test(password) || !/\d/.test(password))
      return Alert.alert("Weak Password", "Password must contain letters and numbers");
    if (password !== confirmPassword) return Alert.alert("Mismatch", "Passwords do not match");

    try {
      setLoading(true);

      // Step 1: Register with backend first to get JWT token
      let backendToken = null;
      try {
        console.log("Registering with backend...");
        const backendRes = await api.post("/api/auth/register", { name, email, password });
        console.log("Backend response:", backendRes.data);

        if (backendRes.data?.data?.token) {
          backendToken = backendRes.data.data.token;
          await saveToken(backendToken);
          console.log("Backend token saved");
        } else {
          console.error("No token in backend response:", backendRes.data);
        }
      } catch (backendErr) {
        console.error("Backend registration failed:", backendErr.message);
        // Backend registration failed - don't proceed with Firebase
        Alert.alert("Registration Failed", "Could not connect to server. Please check your connection and try again.");
        return;
      }

      // Step 2: Firebase registration (only if backend succeeded)
      console.log("Registering with Firebase...");
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(userCredential.user, { displayName: name });
      console.log("Firebase registration complete");

      navigation.replace("Home");
    } catch (error) {
      let msg = "Signup failed";
      if (error.code === "auth/email-already-in-use") msg = "Email already registered";
      else if (error.code === "auth/weak-password") msg = "Weak password";
      else if (error.code === "auth/invalid-email") msg = "Invalid email address";
      else if (error.message) msg = error.message;
      Alert.alert("Signup Error", msg);
    } finally {
      setLoading(false);
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

        <View style={styles.logoContainer}>
          <View style={styles.logoCircle}>
            <MaterialCommunityIcons name="home-lightning-bolt" size={36} color={Colors.white} />
          </View>
          <Text style={styles.appName}>Create Account</Text>
          <Text style={styles.tagline}>Join AI Home Assistant today</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.label}>Full Name</Text>
          <Field icon="person-outline" placeholder="John Doe" value={name} onChangeText={setName} fieldKey="name" focusedField={focusedField} setFocusedField={setFocusedField} />

          <Text style={[styles.label, { marginTop: Spacing.md }]}>Email</Text>
          <Field icon="mail-outline" placeholder="you@example.com" value={email} onChangeText={setEmail} fieldKey="email" keyboard="email-address" focusedField={focusedField} setFocusedField={setFocusedField} />

          <Text style={[styles.label, { marginTop: Spacing.md }]}>Password</Text>
          <Field icon="lock-closed-outline" placeholder="Min. 6 characters" value={password} onChangeText={setPassword} secure fieldKey="password" focusedField={focusedField} setFocusedField={setFocusedField} showPassword={showPassword} setShowPassword={setShowPassword} />

          <Text style={[styles.label, { marginTop: Spacing.md }]}>Confirm Password</Text>
          <Field icon="shield-checkmark-outline" placeholder="Repeat password" value={confirmPassword} onChangeText={setConfirmPassword} secure fieldKey="confirm" focusedField={focusedField} setFocusedField={setFocusedField} showPassword={showPassword} setShowPassword={setShowPassword} />

          <TouchableOpacity
            style={[styles.btn, loading && { opacity: 0.7 }]}
            onPress={handleSignup}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? <ActivityIndicator color={Colors.white} /> : (
              <>
                <Text style={styles.btnText}>Create Account</Text>
                <Ionicons name="checkmark-circle-outline" size={18} color={Colors.white} />
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.loginLink} onPress={() => navigation.navigate("Login")}>
            <Text style={styles.loginLinkText}>Already have an account? </Text>
            <Text style={[styles.loginLinkText, { color: Colors.primary, fontWeight: "700" }]}>Sign In</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const Field = ({ icon, placeholder, value, onChangeText, secure, fieldKey, keyboard, focusedField, setFocusedField, showPassword, setShowPassword }) => (
  <View style={[styles.inputBox, focusedField === fieldKey && styles.inputFocused]}>
    <Ionicons name={icon} size={18} color={focusedField === fieldKey ? Colors.primary : Colors.gray500} />
    <TextInput
      style={styles.input}
      placeholder={placeholder}
      placeholderTextColor={Colors.gray400}
      value={value}
      onChangeText={onChangeText}
      secureTextEntry={secure && !showPassword}
      keyboardType={keyboard || "default"}
      autoCapitalize={keyboard === "email-address" ? "none" : "words"}
      onFocus={() => setFocusedField(fieldKey)}
      onBlur={() => setFocusedField(null)}
    />
    {secure && (
      <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
        <Ionicons name={showPassword ? "eye-off-outline" : "eye-outline"} size={18} color={Colors.gray500} />
      </TouchableOpacity>
    )}
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  scroll: { flexGrow: 1, paddingVertical: Spacing.xl, padding: Spacing.lg },
  logoContainer: { alignItems: "center", marginBottom: Spacing.xl },
  logoCircle: {
    width: 72, height: 72, borderRadius: Radius.xl,
    backgroundColor: Colors.primary, justifyContent: "center",
    alignItems: "center", marginBottom: Spacing.md, ...Shadow.lg,
  },
  appName: { fontSize: FontSize.xxl, fontWeight: "700", color: Colors.text },
  tagline: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 4 },
  card: { backgroundColor: Colors.white, borderRadius: Radius.xl, padding: Spacing.lg, ...Shadow.md },
  label: { fontSize: FontSize.sm, fontWeight: "600", color: Colors.gray700, marginBottom: Spacing.xs },
  inputBox: {
    flexDirection: "row", alignItems: "center", backgroundColor: Colors.gray100,
    borderRadius: Radius.md, paddingHorizontal: Spacing.md, paddingVertical: 2,
    borderWidth: 1.5, borderColor: Colors.border,
  },
  inputFocused: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  input: { flex: 1, paddingVertical: 13, paddingHorizontal: Spacing.sm, fontSize: FontSize.md, color: Colors.text },
  btn: {
    flexDirection: "row", backgroundColor: Colors.primary, borderRadius: Radius.md,
    padding: 15, alignItems: "center", justifyContent: "center",
    marginTop: Spacing.lg, gap: 8, ...Shadow.lg,
  },
  btnText: { color: Colors.white, fontWeight: "700", fontSize: FontSize.md },
  loginLink: { flexDirection: "row", justifyContent: "center", marginTop: Spacing.md },
  loginLinkText: { fontSize: FontSize.sm, color: Colors.textSecondary },
});
