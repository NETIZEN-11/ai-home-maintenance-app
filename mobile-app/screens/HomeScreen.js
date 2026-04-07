import React, { useEffect, useState, useCallback } from "react";
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, RefreshControl, Alert, Image
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { signOut } from "firebase/auth";
import { auth } from "../services/firebase";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import { Colors, Spacing, Radius, Shadow, FontSize } from "../constants/theme";

const APPLIANCE_ICONS = {
  cooling: "air-conditioner", ac: "air-conditioner",
  fridge: "fridge-outline", refrigerator: "fridge-outline",
  washing: "washing-machine", washer: "washing-machine",
  kitchen: "stove", oven: "stove",
  tv: "television", television: "television",
  default: "home-outline",
};

const getIcon = (type = "") => APPLIANCE_ICONS[type.toLowerCase()] || APPLIANCE_ICONS.default;

const getDaysUntil = (date) => {
  if (!date) return null;
  return Math.ceil((new Date(date) - new Date()) / (1000 * 60 * 60 * 24));
};

const getStatus = (days) => {
  if (days === null) return { label: "No date", color: Colors.gray500, bg: Colors.gray200 };
  if (days < 0) return { label: "Overdue", color: Colors.danger, bg: Colors.dangerLight };
  if (days <= 7) return { label: "Urgent", color: Colors.danger, bg: Colors.dangerLight };
  if (days <= 30) return { label: "Due soon", color: Colors.warning, bg: Colors.warningLight };
  return { label: "Good", color: Colors.success, bg: Colors.successLight };
};

export default function HomeScreen({ navigation }) {
  const { user, token, clearToken, saveToken } = useAuth();
  const [appliances, setAppliances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tokenSynced, setTokenSynced] = useState(false);
  const [needsSync, setNeedsSync] = useState(false);

  // Show user's email or UID instead of "there"
  const userName = user?.displayName?.split(" ")[0] || user?.email?.split("@")[0] || user?.uid?.substring(0, 8) || "User";

  // Auto-sync backend token if missing
  useEffect(() => {
    const syncBackendToken = async () => {
      if (!user || tokenSynced) return;
      
      // Check if we have a token
      if (!token) {
        console.log("No backend token found - user may need to sync account");
        setNeedsSync(true);
        setTokenSynced(true);
        return;
      }
      
      // Test if token works silently (don't show alert on home screen)
      try {
        await api.get("/api/appliances");
        console.log("Backend token is valid");
        setNeedsSync(false);
        setTokenSynced(true);
      } catch (err) {
        if (err.message?.includes('Not authorized')) {
          console.log("Backend token invalid - user needs to sync account");
          setNeedsSync(true);
        }
        setTokenSynced(true);
      }
    };
    
    syncBackendToken();
  }, [user, token, tokenSynced]);

  const handleSyncAccount = async () => {
    // For Android, we need a custom input dialog
    // For now, navigate to a sync screen or use a simpler approach
    Alert.alert(
      "Sync Account",
      "To sync your account, please logout and register again with the same email. This will create your backend account.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Logout & Register",
          onPress: async () => {
            await signOut(auth);
            await clearToken();
            navigation.replace("Login");
          }
        }
      ]
    );
  };

  const fetchData = useCallback(async () => {
    try {
      const res = await api.get("/api/appliances");
      setAppliances(res.data.appliances ?? res.data);
    } catch (err) {
      console.log("Fetch error:", err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    navigation.setOptions({ headerShown: false });
  }, []);

  const handleLogout = async () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel" },
      {
        text: "Logout", style: "destructive", onPress: async () => {
          await signOut(auth);
          await clearToken();
          navigation.replace("Login");
        }
      }
    ]);
  };

  const onRefresh = () => { setRefreshing(true); fetchData(); };

  // Calculate stats properly
  const total = appliances.length;
  const urgent = appliances.filter(a => { 
    const d = getDaysUntil(a.serviceDate); 
    return d !== null && d >= 0 && d <= 7; 
  }).length;
  const overdue = appliances.filter(a => { 
    const d = getDaysUntil(a.serviceDate); 
    return d !== null && d < 0; 
  }).length;
  const good = appliances.filter(a => { 
    const d = getDaysUntil(a.serviceDate); 
    return d !== null && d > 30; 
  }).length;

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading your home...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.greeting}>Hi, {userName} 👋</Text>
          <Text style={styles.subGreeting}>Manage your home appliances smartly</Text>
        </View>
        <TouchableOpacity style={styles.avatar} onPress={handleLogout}>
          <Text style={styles.avatarText}>{userName[0]?.toUpperCase()}</Text>
        </TouchableOpacity>
      </View>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <StatCard label="Total" value={total} icon="home-outline" color={Colors.primary} bg={Colors.primaryLight} />
        <StatCard label="Urgent" value={urgent + overdue} icon="alert-circle-outline" color={Colors.danger} bg={Colors.dangerLight} />
        <StatCard label="Good" value={good} icon="checkmark-circle-outline" color={Colors.success} bg={Colors.successLight} />
      </View>

      {/* Quick Actions */}
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.actionsRow}>
        <QuickAction
          icon="add-circle-outline" label="Add Appliance" color={Colors.primary}
          bg={Colors.primaryLight} onPress={() => navigation.navigate("Add Appliance")}
        />
        <QuickAction
          icon="camera-outline" label="Report Issue" color={Colors.warning}
          bg={Colors.warningLight} onPress={() => navigation.navigate("Upload")}
        />
        <QuickAction
          icon="list-outline" label="All Appliances" color={Colors.success}
          bg={Colors.successLight} onPress={() => navigation.navigate("Appliance List")}
        />
        <QuickAction
          icon="notifications-outline" label="Reminders" color="#8B5CF6"
          bg="#F5F3FF" onPress={() => navigation.navigate("Notifications")}
        />
      </View>

      {/* Sync Account Banner */}
      {needsSync && (
        <View style={styles.syncBanner}>
          <Ionicons name="cloud-offline-outline" size={20} color={Colors.primary} />
          <Text style={styles.syncText}>
            Sync your account to enable AI features
          </Text>
          <TouchableOpacity onPress={handleSyncAccount}>
            <Text style={styles.syncAction}>Sync</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Urgent Alert */}
      {(urgent + overdue) > 0 && (
        <View style={styles.alertBanner}>
          <Ionicons name="warning-outline" size={20} color={Colors.warning} />
          <Text style={styles.alertText}>
            {urgent + overdue} appliance{(urgent + overdue) > 1 ? "s" : ""} need immediate attention
          </Text>
          <TouchableOpacity onPress={() => navigation.navigate("Appliance List")}>
            <Text style={styles.alertAction}>View</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Appliance Cards */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Your Appliances</Text>
        <TouchableOpacity onPress={() => navigation.navigate("Appliance List")}>
          <Text style={styles.seeAll}>See all</Text>
        </TouchableOpacity>
      </View>

      {appliances.length === 0 ? (
        <EmptyState onPress={() => navigation.navigate("Add Appliance")} />
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cardsScroll}>
          {appliances.slice(0, 6).map((item) => {
            const days = getDaysUntil(item.serviceDate);
            const status = getStatus(days);
            const imageUrl = item.image && item.image.trim() ? `${api.defaults.baseURL}${item.image}` : null;
            
            return (
              <TouchableOpacity
                key={item._id}
                style={styles.applianceCard}
                onPress={() => navigation.navigate("Appliance List")}
                activeOpacity={0.85}
              >
                {/* Show image if available, otherwise show icon */}
                {imageUrl ? (
                  <Image 
                    source={{ uri: imageUrl }} 
                    style={styles.applianceCardImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={[styles.applianceIconBox, { backgroundColor: Colors.primaryLight }]}>
                    <MaterialCommunityIcons name={getIcon(item.type)} size={28} color={Colors.primary} />
                  </View>
                )}
                <Text style={styles.applianceName} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.applianceType}>{item.type || "Appliance"}</Text>
                <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
                  <View style={[styles.statusDot, { backgroundColor: status.color }]} />
                  <Text style={[styles.statusText, { color: status.color }]}>{status.label}</Text>
                </View>
                {item.serviceDate && (
                  <Text style={styles.serviceDate}>
                    {days < 0 ? `${Math.abs(days)}d overdue` : days === 0 ? "Due today" : `${days}d left`}
                  </Text>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* Recent Activity */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Maintenance Reminders</Text>
      </View>
      {appliances
        .filter(a => a.serviceDate)
        .sort((a, b) => getDaysUntil(a.serviceDate) - getDaysUntil(b.serviceDate))
        .slice(0, 4)
        .map((item) => {
          const days = getDaysUntil(item.serviceDate);
          const status = getStatus(days);
          return (
            <View key={item._id} style={styles.reminderCard}>
              <View style={[styles.reminderIcon, { backgroundColor: status.bg }]}>
                <Ionicons name="calendar-outline" size={18} color={status.color} />
              </View>
              <View style={styles.reminderInfo}>
                <Text style={styles.reminderName}>{item.name}</Text>
                <Text style={styles.reminderDate}>
                  {new Date(item.serviceDate).toDateString()}
                </Text>
              </View>
              <View style={[styles.reminderBadge, { backgroundColor: status.bg }]}>
                <Text style={[styles.reminderBadgeText, { color: status.color }]}>{status.label}</Text>
              </View>
            </View>
          );
        })}

      <View style={{ height: Spacing.xxl }} />
    </ScrollView>
  );
}

const StatCard = ({ label, value, icon, color, bg }) => (
  <View style={[styles.statCard, { backgroundColor: bg }]}>
    <Ionicons name={icon} size={20} color={color} />
    <Text style={[styles.statValue, { color }]}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const QuickAction = ({ icon, label, color, bg, onPress }) => (
  <TouchableOpacity style={styles.quickAction} onPress={onPress} activeOpacity={0.8}>
    <View style={[styles.quickActionIcon, { backgroundColor: bg }]}>
      <Ionicons name={icon} size={22} color={color} />
    </View>
    <Text style={styles.quickActionLabel}>{label}</Text>
  </TouchableOpacity>
);

const EmptyState = ({ onPress }) => (
  <View style={styles.emptyState}>
    <MaterialCommunityIcons name="home-plus-outline" size={56} color={Colors.gray400} />
    <Text style={styles.emptyTitle}>No appliances yet</Text>
    <Text style={styles.emptySubtitle}>Add your first appliance to get started</Text>
    <TouchableOpacity style={styles.emptyBtn} onPress={onPress}>
      <Text style={styles.emptyBtnText}>Add Appliance</Text>
    </TouchableOpacity>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: Colors.background },
  loadingText: { marginTop: Spacing.md, color: Colors.textSecondary, fontSize: FontSize.sm },

  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: Spacing.lg, paddingTop: 56, paddingBottom: Spacing.lg,
    backgroundColor: Colors.white, ...Shadow.sm,
  },
  headerLeft: { flex: 1 },
  greeting: { fontSize: FontSize.xxl, fontWeight: "700", color: Colors.text },
  subGreeting: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 2 },
  avatar: {
    width: 44, height: 44, borderRadius: Radius.full,
    backgroundColor: Colors.primary, justifyContent: "center", alignItems: "center",
  },
  avatarText: { color: Colors.white, fontWeight: "700", fontSize: FontSize.lg },

  statsRow: { flexDirection: "row", padding: Spacing.lg, gap: Spacing.sm },
  statCard: {
    flex: 1, borderRadius: Radius.lg, padding: Spacing.md,
    alignItems: "center", gap: 4, ...Shadow.sm,
  },
  statValue: { fontSize: FontSize.xxl, fontWeight: "800" },
  statLabel: { fontSize: FontSize.xs, color: Colors.textSecondary, fontWeight: "500" },

  sectionTitle: { fontSize: FontSize.lg, fontWeight: "700", color: Colors.text, paddingHorizontal: Spacing.lg, marginBottom: Spacing.sm },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingRight: Spacing.lg, marginBottom: Spacing.sm },
  seeAll: { fontSize: FontSize.sm, color: Colors.primary, fontWeight: "600" },

  actionsRow: { flexDirection: "row", paddingHorizontal: Spacing.lg, gap: Spacing.sm, marginBottom: Spacing.lg },
  quickAction: { flex: 1, alignItems: "center", gap: 6 },
  quickActionIcon: { width: 52, height: 52, borderRadius: Radius.lg, justifyContent: "center", alignItems: "center", ...Shadow.sm },
  quickActionLabel: { fontSize: 10, fontWeight: "600", color: Colors.gray700, textAlign: "center" },

  alertBanner: {
    flexDirection: "row", alignItems: "center", backgroundColor: Colors.warningLight,
    marginHorizontal: Spacing.lg, borderRadius: Radius.md, padding: Spacing.md,
    marginBottom: Spacing.lg, gap: Spacing.sm, borderWidth: 1, borderColor: "#FDE68A",
  },
  alertText: { flex: 1, fontSize: FontSize.sm, color: Colors.gray800, fontWeight: "500" },
  alertAction: { fontSize: FontSize.sm, color: Colors.warning, fontWeight: "700" },

  syncBanner: {
    flexDirection: "row", alignItems: "center", backgroundColor: Colors.primaryLight,
    marginHorizontal: Spacing.lg, borderRadius: Radius.md, padding: Spacing.md,
    marginBottom: Spacing.lg, gap: Spacing.sm, borderWidth: 1, borderColor: Colors.primary,
  },
  syncText: { flex: 1, fontSize: FontSize.sm, color: Colors.gray800, fontWeight: "500" },
  syncAction: { fontSize: FontSize.sm, color: Colors.primary, fontWeight: "700" },

  cardsScroll: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.sm, gap: Spacing.sm },
  applianceCard: {
    width: 140, backgroundColor: Colors.white, borderRadius: Radius.lg,
    padding: Spacing.md, ...Shadow.md,
  },
  applianceIconBox: { width: 48, height: 48, borderRadius: Radius.md, justifyContent: "center", alignItems: "center", marginBottom: Spacing.sm },
  applianceCardImage: { 
    width: "100%", 
    height: 100, 
    borderRadius: Radius.md, 
    marginBottom: Spacing.sm,
    borderWidth: 2,
    borderColor: Colors.border
  },
  applianceName: { fontSize: FontSize.md, fontWeight: "700", color: Colors.text },
  applianceType: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2, marginBottom: Spacing.sm },
  statusBadge: { flexDirection: "row", alignItems: "center", borderRadius: Radius.full, paddingHorizontal: 8, paddingVertical: 3, gap: 4, alignSelf: "flex-start" },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 10, fontWeight: "600" },
  serviceDate: { fontSize: 10, color: Colors.textSecondary, marginTop: 4 },

  reminderCard: {
    flexDirection: "row", alignItems: "center", backgroundColor: Colors.white,
    marginHorizontal: Spacing.lg, borderRadius: Radius.lg, padding: Spacing.md,
    marginBottom: Spacing.sm, ...Shadow.sm, gap: Spacing.md,
  },
  reminderIcon: { width: 40, height: 40, borderRadius: Radius.md, justifyContent: "center", alignItems: "center" },
  reminderInfo: { flex: 1 },
  reminderName: { fontSize: FontSize.md, fontWeight: "600", color: Colors.text },
  reminderDate: { fontSize: FontSize.xs, color: Colors.textSecondary, marginTop: 2 },
  reminderBadge: { borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 4 },
  reminderBadgeText: { fontSize: FontSize.xs, fontWeight: "600" },

  emptyState: { alignItems: "center", padding: Spacing.xxl, marginHorizontal: Spacing.lg, backgroundColor: Colors.white, borderRadius: Radius.xl, ...Shadow.sm },
  emptyTitle: { fontSize: FontSize.lg, fontWeight: "700", color: Colors.text, marginTop: Spacing.md },
  emptySubtitle: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 4, textAlign: "center" },
  emptyBtn: { backgroundColor: Colors.primary, borderRadius: Radius.md, paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, marginTop: Spacing.lg },
  emptyBtnText: { color: Colors.white, fontWeight: "700", fontSize: FontSize.sm },
});
