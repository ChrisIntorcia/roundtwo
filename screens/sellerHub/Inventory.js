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
  RefreshControl,
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
import { Ionicons } from "@expo/vector-icons";

const SCREEN_WIDTH = Dimensions.get("window").width;

const Inventory = () => {
  const { user } = useContext(AppContext);
  const navigation = useNavigation();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchProducts = () => {
    if (!user) {
      setLoading(false);
      return;
    }

    const q = query(collection(db, "products"), where("sellerId", "==", user.uid));

    return onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setProducts(data);
      setLoading(false);
      setRefreshing(false);
    });
  };

  useEffect(() => {
    const unsubscribe = fetchProducts();
    return unsubscribe;
  }, [user]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchProducts();
  };

  const deleteProduct = async (product) => {
    try {
      await deleteDoc(doc(db, "products", product.id));
      Alert.alert("Success", "Product has been removed successfully");
    } catch (err) {
      console.error("Failed to delete product", err);
      Alert.alert("Error", "Failed to delete product. Please try again.");
    }
  };

  const renderRightActions = (item) => (
    <View style={styles.rightAction}>
      <TouchableOpacity
        style={styles.swipeEditButton}
        onPress={() => {
          navigation.navigate("EditProductScreen", { product: item });
        }}
      >
        <Ionicons name="pencil-outline" size={24} color="#666" />
        <Text style={styles.editText}>Edit</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => {
          Alert.alert(
            "Delete Product",
            "Are you sure you want to delete this product? This action cannot be undone.",
            [
              { text: "Cancel", style: "cancel" },
              { text: "Delete", style: "destructive", onPress: () => deleteProduct(item) },
            ]
          );
        }}
      >
        <Ionicons name="trash-outline" size={24} color="#666" />
        <Text style={styles.deleteText}>Delete</Text>
      </TouchableOpacity>
    </View>
  );

  const renderItem = ({ item }) => (
    <Swipeable
      friction={2}
      leftThreshold={30}
      rightThreshold={30}
      renderRightActions={() => renderRightActions(item)}
      overshootLeft={false}
      overshootRight={false}
      leftActivationDistance={50}
      rightActivationDistance={50}
    >
      <TouchableOpacity 
        style={styles.card}
        onPress={() => navigation.navigate("ProductDetailsScreen", { product: item })}
        activeOpacity={0.7}
      >
        <FastImage
          source={
            item.images?.[0]
              ? { uri: item.images[0], priority: FastImage.priority.normal }
              : { uri: "https://via.placeholder.com/80", priority: FastImage.priority.low }
          }
          style={styles.image}
          resizeMode={FastImage.resizeMode.cover}
        />
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={2}>{item.title || "Untitled"}</Text>
          <View style={styles.priceRow}>
            <Text style={styles.price}>${item.fullPrice?.toFixed(2) || "0.00"}</Text>
            {item.bulkPrice && (
              <Text style={styles.bulkPrice}>
                Live: ${item.bulkPrice.toFixed(2)}
              </Text>
            )}
          </View>
          <View style={styles.statsRow}>
            <View style={styles.stat}>
              <Ionicons name="cube-outline" size={16} color="#666" />
              <Text style={styles.statText}>{item.quantity || 0}</Text>
            </View>
            {item.views && (
              <View style={styles.stat}>
                <Ionicons name="eye-outline" size={16} color="#666" />
                <Text style={styles.statText}>{item.views}</Text>
              </View>
            )}
          </View>
        </View>
        <TouchableOpacity style={styles.chevronButton}>
          <Ionicons name="chevron-forward" size={20} color="#999" />
        </TouchableOpacity>
      </TouchableOpacity>
    </Swipeable>
  );

  const EmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons name="cube-outline" size={48} color="#ccc" />
      <Text style={styles.emptyTitle}>No Products Yet</Text>
      <Text style={styles.emptyText}>
        Start adding products to your inventory to begin selling.
      </Text>
      <TouchableOpacity
        style={styles.addButton}
        onPress={() => navigation.navigate("CreateProductScreen")}
      >
        <Ionicons name="add" size={24} color="#fff" />
        <Text style={styles.addButtonText}>Add Product</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#E76A54" />
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.centered}>
        <Ionicons name="lock-closed-outline" size={48} color="#ccc" />
        <Text style={styles.authTitle}>Sign In Required</Text>
        <Text style={styles.authText}>
          Please sign in to view and manage your inventory.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CustomHeader 
        title="My Inventory" 
        showBack 
        onBack={() => navigation.goBack()} 
        rightComponent={
          products.length > 0 ? (
            <TouchableOpacity 
              onPress={() => navigation.navigate("CreateProductScreen")}
              style={styles.headerButton}
            >
              <Ionicons name="add" size={24} color="#E76A54" />
            </TouchableOpacity>
          ) : null
        }
      />
      <FlatList
        data={products}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={styles.listContainer}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={EmptyState}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#E76A54"
          />
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  listContainer: {
    padding: 16,
    flexGrow: 1,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  card: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 12,
    alignItems: "center",
    minHeight: 100,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  image: {
    width: 80,
    height: 80,
    borderRadius: 12,
    marginRight: 16,
    backgroundColor: "#f5f5f5",
  },
  info: {
    flex: 1,
    marginRight: 8,
  },
  name: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  price: {
    fontSize: 16,
    fontWeight: "600",
    color: "#E76A54",
    marginRight: 8,
  },
  bulkPrice: {
    fontSize: 14,
    color: "#666",
  },
  streamPrice: {
    fontSize: 12,
    color: "#999",
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  stat: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 16,
  },
  statText: {
    fontSize: 14,
    color: "#666",
    marginLeft: 4,
  },
  editButton: {
    backgroundColor: "#4CAF50",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    marginVertical: 4,
    borderRadius: 16,
    width: SCREEN_WIDTH * 0.25,
  },
  editText: {
    color: "#666",
    fontWeight: "600",
    marginTop: 4,
    fontSize: 12,
  },
  deleteButton: {
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
    height: '100%',
  },
  deleteText: {
    color: "#666",
    fontWeight: "600",
    marginTop: 4,
    fontSize: 12,
  },
  separator: {
    height: 12,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
    paddingVertical: 48,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#333",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 15,
    color: "#666",
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 20,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#E76A54",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  addButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  headerButton: {
    padding: 8,
  },
  authTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#333",
    marginTop: 16,
    marginBottom: 8,
  },
  authText: {
    fontSize: 15,
    color: "#666",
    textAlign: "center",
    maxWidth: "80%",
    lineHeight: 20,
  },
  chevronButton: {
    padding: 8,
  },
  rightAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingLeft: 16,
  },
  swipeEditButton: {
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
    height: '100%',
    marginRight: 8,
  },
});

export default Inventory;
