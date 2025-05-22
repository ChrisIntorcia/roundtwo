import React, { useEffect, useState } from "react";
import {
  View,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  Text,
  TouchableOpacity,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { getFirestore, collection, onSnapshot, query, limit, orderBy } from "firebase/firestore";
import Header from "./Browse/Header";
import ProductCard from "./Browse/ProductCard";
import EmptyState from "./Browse/EmptyState";
import ErrorState from "./Browse/ErrorState";
import styles from "./Browse/styles";

const db = getFirestore();

const BrowseScreen = () => {
  const [productItems, setProductItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const navigation = useNavigation();
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [priceRange, setPriceRange] = useState("all");
  const [sortBy, setSortBy] = useState("newest");

  const fetchData = () => {
    try {
      const productsQuery = query(
        collection(db, "products"), 
        orderBy("createdAt", "desc"),
        limit(50)
      );
      
      const unsubscribeProducts = onSnapshot(productsQuery, 
        (snapshot) => {
          const productList = snapshot.docs.map((doc) => ({
            id: doc.id,
            type: 'product',
            ...doc.data(),
          }));
          setProductItems(productList);
          setLoading(false);
          setIsRefreshing(false);
        },
        (error) => {
          setError(error.message);
          setLoading(false);
          setIsRefreshing(false);
        }
      );

      return () => {
        unsubscribeProducts();
      };
    } catch (err) {
      setError(err.message);
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    const unsubscribe = fetchData();
    return () => unsubscribe?.();
  }, []);

  const onRefresh = () => {
    setIsRefreshing(true);
    fetchData();
  };

  const normalizeItem = (item) => item;

  const filterByPrice = (item) => {
    const price = parseFloat(item.fullPrice || item.price || 0);
    switch (priceRange) {
      case 'under5':
        return price < 5;
      case '5to10':
        return price >= 5 && price <= 10;
      case '10to20':
        return price > 10 && price <= 20;
      case 'over20':
        return price > 20;
      default:
        return true;
    }
  };

  const sortItems = (items) => {
    return [...items].sort((a, b) => {
      const priceA = parseFloat(a.fullPrice || a.price || 0);
      const priceB = parseFloat(b.fullPrice || b.price || 0);
      
      switch (sortBy) {
        case 'price_low':
          return priceA - priceB;
        case 'price_high':
          return priceB - priceA;
        case 'newest':
        default:
          return new Date(b.createdAt?.toDate() || 0) - new Date(a.createdAt?.toDate() || 0);
      }
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#E76A54" />
      </View>
    );
  }

  const allItems = [...productItems];

  // Filtering logic
  const filteredItems = allItems
    .filter(item => {
      // Search filter
      const matchesSearch = search.trim() === "" || (item.title && item.title.toLowerCase().includes(search.toLowerCase()));
      
      // Category filter
      if (selectedCategory === "all") return matchesSearch;
      const categoryMap = {
        sour: ["sour"],
        chewy: ["chewy"],
        fruit: ["fruit"],
      };
      const itemCategory = (item.category || item.title || "").toLowerCase();
      const matchesCategory = categoryMap[selectedCategory].some(cat => itemCategory.includes(cat));
      
      // Price filter
      const matchesPrice = filterByPrice(item);
      
      return matchesSearch && matchesCategory && matchesPrice;
    });

  // Sort the filtered items
  const sortedAndFilteredItems = sortItems(filteredItems);

  return (
    <SafeAreaView style={styles.container}>
      {error ? (
        <ErrorState error={error} onRetry={fetchData} />
      ) : (
        <FlatList
          data={sortedAndFilteredItems}
          keyExtractor={(item) => `${item.type}-${item.id}`}
          renderItem={({ item }) => (
            <ProductCard item={normalizeItem(item)} navigation={navigation} />
          )}
          numColumns={2}
          contentContainerStyle={styles.grid}
          columnWrapperStyle={styles.row}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <Header
              search={search}
              setSearch={setSearch}
              selectedCategory={selectedCategory}
              setSelectedCategory={setSelectedCategory}
              priceRange={priceRange}
              setPriceRange={setPriceRange}
              sortBy={sortBy}
              setSortBy={setSortBy}
            />
          }
          ListEmptyComponent={<EmptyState />}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              tintColor="#E76A54"
            />
          }
          removeClippedSubviews={true}
          initialNumToRender={6}
          maxToRenderPerBatch={8}
          windowSize={12}
        />
      )}
    </SafeAreaView>
  );
};

export default BrowseScreen;