import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Alert,
} from "react-native";
import { auth } from "../../firebaseConfig";
import { collection, query, where, getDocs, getFirestore } from "firebase/firestore";

const TransactionsScreen = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const db = getFirestore();

  useEffect(() => {
    const fetchTransactions = async () => {
      setLoading(true);
      try {
        const user = auth.currentUser;
        if (!user) return;

        const q = query(
          collection(db, "transactions"),
          where("sellerId", "==", user.uid)
        );
        const querySnapshot = await getDocs(q);

        const items = [];
        querySnapshot.forEach((doc) => {
          items.push({ id: doc.id, ...doc.data() });
        });

        setTransactions(items);
      } catch (err) {
        console.error("Error loading transactions:", err);
        Alert.alert("Error", "Could not load transaction history.");
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, []);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#FFD700" />
      </View>
    );
  }

  if (transactions.length === 0) {
    return (
      <View style={styles.centered}>
        <Text style={styles.noTransactions}>No transactions yet.</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={transactions}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.container}
      renderItem={({ item }) => (
        <View style={styles.transactionItem}>
          <Text style={styles.product}>{item.productName || "Unknown Product"}</Text>
          <Text style={styles.amount}>${(item.amount / 100).toFixed(2)}</Text>
          <Text style={styles.date}>{new Date(item.timestamp).toLocaleDateString()}</Text>
        </View>
      )}
    />
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: "#121212",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#121212",
  },
  noTransactions: {
    color: "#888",
    fontSize: 16,
  },
  transactionItem: {
    backgroundColor: "#1E1E1E",
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
  },
  product: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  amount: {
    color: "#FFD700",
    fontSize: 16,
  },
  date: {
    color: "#999",
    fontSize: 14,
    marginTop: 5,
  },
});

export default TransactionsScreen;