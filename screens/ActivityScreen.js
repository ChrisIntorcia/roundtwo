import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, FlatList } from "react-native";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "../firebaseConfig";
import CustomHeader from "../components/CustomHeader";

const ActivityScreen = () => {
  const [purchases, setPurchases] = useState([]);

  useEffect(() => {
    const q = query(collection(db, "purchases"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setPurchases(data);
    });
    return unsubscribe;
  }, []);

  return (
    <View style={styles.container}>
      <CustomHeader title="Recent Activity" />
      <FlatList
        data={purchases}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 10, paddingBottom: 20 }}
        renderItem={({ item }) => (
          <View style={styles.purchaseItem}>
            <Text style={styles.product}>{item.product}</Text>
            <Text style={styles.details}>
              ${item.price} by {item.buyer}
            </Text>
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "white" },
  title: { fontSize: 20, fontWeight: "bold", marginBottom: 10 },
  purchaseItem: { marginBottom: 15 },
  product: { fontSize: 16, fontWeight: "bold" },
  details: { fontSize: 14, color: "#555" },
});

export default ActivityScreen;
