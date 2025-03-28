import React from "react";
import { View, Text, StyleSheet } from "react-native";

const ActivityScreen = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>Activity Screen</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "white",
  },
  text: {
    fontSize: 18,
    fontWeight: "bold",
  },
});

export default ActivityScreen;
