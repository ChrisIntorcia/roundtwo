import React, { useEffect, useState } from "react";
import { View, Text, FlatList, Image, StyleSheet, TouchableOpacity } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { getFirestore, collection, onSnapshot } from "firebase/firestore";

const db = getFirestore();

const HomeScreen = () => {
  const [products, setProducts] = useState([]);
  const navigation = useNavigation();

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "products"), (snapshot) => {
      const productList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setProducts(productList);
    });

    return () => unsubscribe();
  }, []);

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.productCard}
      onPress={() => navigation.navigate("ProductDetailsScreen", { product: item })}
    >
      <Image source={{ uri: item.images[0] }} style={styles.image} />
      <View style={styles.infoContainer}>
        {/* Title on top */}
        <Text style={styles.title}>{item.title}</Text>
        {/* Prices below the title */}
        <View style={styles.priceContainer}>
          <Text style={styles.label}>Price:</Text>
          <Text style={styles.price}>${item.fullPrice}</Text>
          <Text style={styles.label}>Group Price:</Text>
          <Text style={styles.price}>${item.groupPrice}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Latest Products</Text>
      <FlatList
        data={products}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        numColumns={2} // ✅ Two products per row
        columnWrapperStyle={styles.row} // ✅ Ensures proper spacing
        contentContainerStyle={{ paddingBottom: 20 }} // ✅ Adds bottom padding
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 10,
    backgroundColor: "#f9f9f9",
  },
  header: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "center",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  productCard: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 10,
    marginHorizontal: 5,
    borderRadius: 8,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  image: {
    width: "100%",
    height: 150,
    borderRadius: 8,
    resizeMode: "cover",
  },
  infoContainer: {
    alignItems: "center", // ✅ Centers title and prices
    marginTop: 5,
  },
  title: {
    fontSize: 16,
    fontWeight: "bold",
    color: "black", // ✅ Ensures title remains black
    textAlign: "center",
  },
  priceContainer: {
    flexDirection: "row",
    justifyContent: "center", // ✅ Centers the prices
    alignItems: "center",
    marginTop: 2,
  },
  label: {
    fontSize: 12,
    fontWeight: "bold",
    color: "gray", // ✅ Labels in gray
    marginHorizontal: 2,
  },
  price: {
    fontSize: 12, // ✅ Dynamic smaller size
    fontWeight: "bold",
    color: "green",
    marginHorizontal: 2,
  },
});

export default HomeScreen;
