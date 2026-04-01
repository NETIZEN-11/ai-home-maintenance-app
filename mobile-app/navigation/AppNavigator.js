import React from "react";
import { ActivityIndicator, View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";

import { useAuth } from "../context/AuthContext";
import { Colors, FontSize } from "../constants/theme";

import LoginScreen from "../screens/LoginScreen";
import RegisterScreen from "../screens/RegisterScreen";
import HomeScreen from "../screens/HomeScreen";
import AddApplianceScreen from "../screens/AddApplianceScreen";
import ApplianceListScreen from "../screens/ApplianceListScreen";
import EditApplianceScreen from "../screens/EditApplianceScreen";
import UploadScreen from "../screens/UploadScreen";
import AIResponseScreen from "../screens/AiResponseScreen";
import NotificationScreen from "../screens/NotificationScreen";

const Stack = createNativeStackNavigator();

const screenOptions = {
  headerStyle: { backgroundColor: Colors.white },
  headerTintColor: Colors.text,
  headerTitleStyle: { fontWeight: "700", fontSize: FontSize.lg },
  headerTitleAlign: "center",
  headerShadowVisible: false,
  contentStyle: { backgroundColor: Colors.background },
};

export default function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: Colors.background }}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={user ? "Home" : "Login"}
        screenOptions={screenOptions}
      >
        <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Register" component={RegisterScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
        <Stack.Screen name="Add Appliance" component={AddApplianceScreen} options={{ title: "Add Appliance" }} />
        <Stack.Screen name="Appliance List" component={ApplianceListScreen} options={{ title: "My Appliances" }} />
        <Stack.Screen name="Edit Appliance" component={EditApplianceScreen} options={{ title: "Edit Appliance" }} />
        <Stack.Screen name="Upload" component={UploadScreen} options={{ title: "Report Issue" }} />
        <Stack.Screen name="AIResponse" component={AIResponseScreen} options={{ title: "AI Analysis", headerStyle: { backgroundColor: Colors.primary }, headerTintColor: Colors.white, headerTitleStyle: { fontWeight: "700", color: Colors.white } }} />
        <Stack.Screen name="Notifications" component={NotificationScreen} options={{ title: "Reminders" }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
