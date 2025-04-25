import React, { useEffect, useState, useContext } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  Dimensions,
} from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import { db } from "../../firebaseConfig";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  deleteDoc,
} from "firebase/firestore";
import { AppContext } from "../../context/AppContext";
import FastImage from "react-native-fast-image";
import CustomHeader from "../../components/CustomHeader";
import { useNavigation } from "@react-navigation/native";

const SCREEN_WIDTH = Dimensions.get("window").width;

const Inventory = () => {
  const { user } = useContext(AppContext);
  const navigation = useNavigation();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      console.log("❌ No user in context");
      setLoading(false);
      return;
    }

    const q = query(collection(db, "products"), where("sellerId", "==", user.uid))

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setProducts(data);
      setLoading(false);
      console.log("✅ Products fetched:", data.length);
    });

    return unsubscribe;
  }, [user]);

  const deleteProduct = async (product) => {
    try {
      await deleteDoc(doc(db, "products", product.id));
  
      Alert.alert("Deleted", "Product has been removed.");
    } catch (err) {
      console.error("Failed to delete product", err);
      Alert.alert("Error", "Failed to delete product.");
    }
  };
  

  const renderRightActions = (progress, dragX, product) => (
    <TouchableOpacity
      onPress={() =>
        Alert.alert("Confirm Delete", "Are you sure?", [
          { text: "Cancel", style: "cancel" },
          { text: "Delete", style: "destructive", onPress: () => deleteProduct(product) },
        ])
      }
      style={styles.deleteButton}
    >
      <Text style={styles.deleteText}>Delete</Text>
    </TouchableOpacity>
  );

  const renderItem = ({ item }) => (
    <Swipeable
      friction={2}
      overshootRight={false}
      renderRightActions={(progress, dragX) =>
        renderRightActions(progress, dragX, item)
      }
    >
      <View style={styles.card}>
        <FastImage
          source={
            item.images?.[0]
              ? { uri: item.images[0], priority: FastImage.priority.normal }
              : { uri: "https://via.placeholder.com/80" }
          }
          style={styles.image}
          resizeMode={FastImage.resizeMode.cover}
        />
        <View style={styles.info}>
          <Text style={styles.name}>{item.title || "Untitled"}</Text>
          <Text style={styles.details}>${item.fullPrice?.toFixed(2) || "0.00"}</Text>
          <Text style={styles.details}>Quantity: {item.quantity || 0}</Text>
        </View>
      </View>
    </Swipeable>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.centered}>
        <Text style={{ color: "#888", fontSize: 16 }}>You must be signed in to view your inventory.</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <CustomHeader title="My Inventory" showBack onBack={() => navigation.goBack()} />
      {products.length === 0 ? (
        <View style={styles.centered}>
          <Text style={{ color: "#888", fontSize: 16 }}>No products found.</Text>
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.container}
          ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: "#fff",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  card: {
    flexDirection: "row",
    backgroundColor: "#f5f5f5",
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    minHeight: 100,
  },
  image: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 16,
    backgroundColor: "#ddd",
  },
  info: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: "600",
    color: "#222",
  },
  details: {
    fontSize: 14,
    color: "#555",
    marginTop: 4,
  },
  deleteButton: {
    backgroundColor: "red",
    justifyContent: "center",
    alignItems: "flex-end",
    paddingHorizontal: 20,
    marginVertical: 5,
    borderRadius: 12,
    width: SCREEN_WIDTH * 0.3,
  },
  deleteText: {
    color: "#fff",
    fontWeight: "bold",
  },
});

export default Inventory;
