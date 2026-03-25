import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function NotificationCard({ item = {} }) {

  //  Safe fallback (avoid crash)
  const {
    title = "Notification",
    message = "No message available",
    date,
    type = "INFO"
  } = item;

  //  Format date
  const formattedDate = date
    ? new Date(date).toDateString()
    : "No date";

  //  Status logic (PRD aligned)
  const isUrgent = type === "REMINDER";

  return (
    <View style={[styles.card, isUrgent && styles.urgentCard]}>

      {/*  Title */}
      <Text style={styles.title}>{title}</Text>

      {/*  Message */}
      <Text style={styles.message}>{message}</Text>

      {/*  Date */}
      <Text style={styles.date}>{formattedDate}</Text>

      {/*  Status */}
      <Text style={[styles.status, isUrgent ? styles.urgent : styles.normal]}>
        {isUrgent ? "Service Reminder" : "Information"}
      </Text>

    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    padding: 15,
    marginVertical: 8,
    borderRadius: 12,
    elevation: 3,
  },

  urgentCard: {
    borderLeftWidth: 5,
    borderLeftColor: "#F44336",
  },

  title: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 5,
  },

  message: {
    fontSize: 14,
    marginBottom: 5,
    color: "#333",
  },

  date: {
    fontSize: 12,
    color: "gray",
  },

  status: {
    marginTop: 6,
    fontWeight: "bold",
  },

  urgent: {
    color: "#F44336",
  },

  normal: {
    color: "#4CAF50",
  },
});