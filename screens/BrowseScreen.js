import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { getFirestore, collection, onSnapshot } from "firebase/firestore";
import FastImage from "react-native-fast-image";
import CustomHeader from "../components/CustomHeader";

const db = getFirestore();

const BrowseScreen = () => {
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

  const renderItem = ({ item }) => {
    const imageUrl =
      item.images && Array.isArray(item.images) && item.images[0]
        ? item.images[0]
        : null;

    return (
      <TouchableOpacity
        style={styles.productCard}
        onPress={() =>
          navigation.navigate("ProductDetailsScreen", { product: item })
        }
      >
        {imageUrl ? (
          <FastImage
            source={{ uri: imageUrl, priority: FastImage.priority.normal }}
            style={styles.image}
            resizeMode={FastImage.resizeMode.cover}
          />
        ) : (
          <View style={[styles.image, styles.imagePlaceholder]}>
            <Text style={{ color: "#aaa", fontSize: 12 }}>No Image</Text>
          </View>
        )}
        <View style={styles.infoContainer}>
          <Text style={styles.title}>{item.title}</Text>
          <View style={styles.priceContainer}>
            <Text style={styles.label}>Price:</Text>
            <Text style={styles.price}>${item.fullPrice}</Text>
            <Text style={styles.label}>Group Price:</Text>
            <Text style={styles.price}>${item.groupPrice}</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <CustomHeader title="Latest Products" />
      <FlatList
        data={products}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={{ paddingBottom: 20 }}
        removeClippedSubviews={true}
        initialNumToRender={4}
        maxToRenderPerBatch={6}
        windowSize={10}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9f9f9",
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
  },
  imagePlaceholder: {
    backgroundColor: "#eee",
    justifyContent: "center",
    alignItems: "center",
  },
  infoContainer: {
    alignItems: "center",
    marginTop: 5,
  },
  title: {
    fontSize: 16,
    fontWeight: "bold",
    color: "black",
    textAlign: "center",
  },
  priceContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 2,
    flexWrap: "wrap",
  },
  label: {
    fontSize: 12,
    fontWeight: "bold",
    color: "gray",
    marginHorizontal: 2,
  },
  price: {
    fontSize: 12,
    fontWeight: "bold",
    color: "green",
    marginHorizontal: 2,
  },
});

export default BrowseScreen;