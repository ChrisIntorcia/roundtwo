import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Platform,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import Constants from "expo-constants";

const CustomHeader = ({ title, children, showBack = false }) => {
  const navigation = useNavigation();
  const topPadding = Platform.OS === "ios" ? Constants.statusBarHeight - 10 : 0;

  return (
    <View style={[styles.headerContainer, { paddingTop: topPadding }]}>
      <View style={styles.inner}>
        <View style={styles.leftSection}>
          {showBack && (
            <TouchableOpacity
              onPress={() => navigation.canGoBack() && navigation.goBack()}
              style={styles.backButton}
            >
              <Ionicons name="chevron-back" size={24} color="#222" />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.titleSection}>
          <Text style={styles.title} numberOfLines={1}>{title}</Text>
        </View>

        <View style={styles.rightSection}>
          {children}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    backgroundColor: "#fff",
    width: "100%",
    paddingBottom: 4,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  inner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    height: 44,
  },
  leftSection: {
    width: 40,
    alignItems: 'flex-start',
  },
  titleSection: {
    flex: 1,
    alignItems: 'center',
  },
  rightSection: {
    width: 40,
    alignItems: 'flex-end',
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: "#222",
    textAlign: 'center',
  },
});

export default CustomHeader;
