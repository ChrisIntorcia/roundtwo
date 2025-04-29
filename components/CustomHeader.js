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
  const topPadding = Platform.OS === "ios" ? Constants.statusBarHeight + 8 : StatusBar.currentHeight || 10;

  return (
    <View style={[styles.headerContainer, { paddingTop: topPadding }]}>
      <View style={styles.inner}>
        {showBack && (
          <TouchableOpacity
            onPress={() => navigation.canGoBack() && navigation.goBack()}
            style={styles.backButton}
          >
            <Ionicons name="chevron-back" size={24} color="#222" />
          </TouchableOpacity>
        )}
        {title && <Text style={styles.title}>{title}</Text>}
        {children}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  headerContainer: {
    backgroundColor: "#fff",
    width: "100%",
    paddingBottom: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  inner: {
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    marginRight: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#222",
  },
});

export default CustomHeader;
