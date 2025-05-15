import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  TouchableOpacity,
  ActivityIndicator,
  Dimensions,
  RefreshControl,
  SafeAreaView,
} from "react-native";
import FastImage from "react-native-fast-image";
import {
  getFirestore,
  collection,
  query,
  where,
  orderBy,
  getDocs,
  doc,
  getDoc,
} from "firebase/firestore";
import { auth } from "../firebaseConfig";
import { Ionicons } from '@expo/vector-icons';

const db = getFirestore();
const { width } = Dimensions.get('window');

const ActivityTypeIcons = {
  purchase: "cart",
  shipped: "checkmark-circle",
  toShip: "time",
  newProduct: "pricetag",
  newStream: "videocam",
  message: "chatbubble"
};

const ActivityColors = {
  purchase: "#4CAF50",
  shipped: "#2196F3",
  toShip: "#FFC107",
  newProduct: "#9C27B0",
  newStream: "#E91E63",
  message: "#00BCD4"
};

const formatDateGroup = (date) => {
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const isSameDay = (d1, d2) =>
    d1.getDate() === d2.getDate() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getFullYear() === d2.getFullYear();

  if (isSameDay(date, today)) return "Today";
  if (isSameDay(date, yesterday)) return "Yesterday";
  
  // Format dates within the last week as "Monday", "Tuesday", etc.
  const weekAgo = new Date();
  weekAgo.setDate(today.getDate() - 7);
  if (date > weekAgo) {
    return date.toLocaleDateString('en-US', { weekday: 'long' });
  }
  
  // Format older dates as "January 1", "February 15", etc.
  return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
};

const ActivityScreen = ({ navigation }) => {
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [displayLimit, setDisplayLimit] = useState(8);
  const currentUser = auth.currentUser;

  const fetchData = async () => {
    if (!currentUser) return;

    try {
      const userId = currentUser.uid;
      const [purchasesSnap, ordersSnap, productsSnap, streamsSnap, chatsSnap, followingSnap] =
        await Promise.all([
          getDocs(query(collection(db, "users", userId, "purchases"))),
          getDocs(query(collection(db, "orders"), where("sellerId", "==", userId))),
          getDocs(query(collection(db, "products"))),
          getDocs(query(collection(db, "livestreams"))),
          getDocs(query(collection(db, "chats"), where("users", "array-contains", userId))),
          getDocs(collection(db, "users", userId, "following")),
        ]);

      const followingIds = followingSnap.docs.map((doc) => doc.id);
      const activityItems = [];

      for (const docSnap of purchasesSnap.docs) {
        const data = docSnap.data();
        activityItems.push({
          type: "purchase",
          timestamp: data.purchasedAt?.toDate?.() || new Date(),
          title: `You purchased \"${data.title}\"`,
          subtitle: `$${data.price}`,
          image: data.image || null,
          onPress: () => navigation.navigate("OrderDetailsScreen", { orderId: data.orderId || docSnap.id }),
        });
      }

      for (const docSnap of ordersSnap.docs) {
        const data = docSnap.data();
        activityItems.push({
          type: data.fulfilled ? "shipped" : "toShip",
          timestamp: data.purchasedAt?.toDate?.() || new Date(),
          title: data.fulfilled
            ? `You shipped "${data.title}"`
            : `You need to ship "${data.title}"`,
          subtitle: data.fulfilled ? "Order completed" : "Action required",
          image: null,
          onPress: () => navigation.navigate("OrderDetailsScreen", { orderId: docSnap.id }),
        });
      }

      for (const docSnap of productsSnap.docs) {
        const data = docSnap.data();
        if (followingIds.includes(data.sellerId)) {
          activityItems.push({
            type: "newProduct",
            timestamp: data.createdAt?.toDate?.() || new Date(),
            title: `New product listed: "${data.title}"`,
            subtitle: `$${data.price}`,
            image: data.images?.[0] || null,
            onPress: () =>
              navigation.navigate("ProductDetailsScreen", { productId: docSnap.id }),
          });
        }
      }

      for (const docSnap of streamsSnap.docs) {
        const data = docSnap.data();
        if (followingIds.includes(data.firebaseUid)) {
          activityItems.push({
            type: "newStream",
            timestamp: data.startedAt?.toDate?.() || new Date(),
            title: `New stream started: "${data.title || "Untitled Stream"}"`,
            subtitle: "Live now",
            image: data.thumbnail || null,
            onPress: () =>
              navigation.navigate("ViewerScreen", { channel: docSnap.id }),
          });
        }
      }

      for (const docSnap of chatsSnap.docs) {
        const data = docSnap.data();
        const otherId = data.users.find((uid) => uid !== currentUser.uid);
        const userDoc = await getDoc(doc(db, "users", otherId));
        const username = userDoc.data()?.username || "User";

        activityItems.push({
          type: "message",
          timestamp: data.updatedAt?.toDate?.() || new Date(),
          title: `New message from @${username}`,
          subtitle: data.lastMessage || "New conversation",
          image: userDoc.data()?.avatarUrl || null,
          onPress: () =>
            navigation.navigate("MessagesScreen", {
              otherUserId: otherId,
              otherUsername: username,
            }),
        });
      }

      // Log all activity items for debugging
      console.log('Activity items:', activityItems);
      const validActivityItems = activityItems.filter(item => {
        if (!item.timestamp || isNaN(new Date(item.timestamp).getTime())) {
          console.warn('Skipping activity item with invalid timestamp:', item);
          return false;
        }
        return true;
      });

      const grouped = validActivityItems.reduce((acc, item) => {
        const group = formatDateGroup(item.timestamp);
        if (!acc[group]) acc[group] = [];
        acc[group].push(item);
        return acc;
      }, {});

      const formattedSections = Object.keys(grouped).map((key) => ({
        title: key,
        data: grouped[key]
          .sort((a, b) => b.timestamp - a.timestamp)
          .slice(0, displayLimit),
        fullData: grouped[key].sort((a, b) => b.timestamp - a.timestamp),
      }));

      setSections(formattedSections);
    } catch (err) {
      console.error("Failed to fetch activity:", err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [displayLimit]);

  const onRefresh = () => {
    setIsRefreshing(true);
    fetchData();
  };

  const loadMoreItems = () => {
    setDisplayLimit((prev) => prev + 8);
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>Activity</Text>
    </View>
  );

  const renderItem = ({ item }) => (
    <TouchableOpacity 
      onPress={item.onPress} 
      style={styles.item}
      activeOpacity={0.7}
    >
      <View style={[styles.iconContainer, { backgroundColor: ActivityColors[item.type] }]}>
        <Ionicons name={ActivityTypeIcons[item.type]} size={20} color="white" />
      </View>
      
      {item.image ? (
        <FastImage 
          source={{ uri: item.image }} 
          style={styles.image}
          resizeMode={FastImage.resizeMode.cover}
        />
      ) : (
        <View style={[styles.image, styles.placeholderImage]}>
          <Ionicons name="image-outline" size={20} color="#999" />
        </View>
      )}
      
      <View style={styles.contentContainer}>
        <Text style={styles.itemTitle} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.itemSubtitle}>{item.subtitle}</Text>
        <Text style={styles.timestamp}>
          {item.timestamp.toLocaleTimeString([], {
            hour: "numeric",
            minute: "2-digit",
          })}
        </Text>
      </View>
      
      <Ionicons name="chevron-forward" size={20} color="#999" />
    </TouchableOpacity>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="notifications-outline" size={50} color="#ccc" />
      <Text style={styles.emptyText}>No Activity Yet</Text>
      <Text style={styles.emptySubtext}>Your recent activity will appear here</Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#E76A54" />
        <Text style={styles.loadingText}>Loading your activity...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <SectionList
        sections={sections}
        keyExtractor={(item, index) => item.timestamp + index}
        renderItem={renderItem}
        renderSectionHeader={({ section: { title } }) => (
          <View style={styles.sectionHeaderContainer}>
            <Text style={styles.sectionHeader}>{title}</Text>
          </View>
        )}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        onEndReached={loadMoreItems}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor="#E76A54"
          />
        }
        contentContainerStyle={styles.listContainer}
        stickySectionHeadersEnabled={true}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#222',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
  listContainer: {
    flexGrow: 1,
  },
  sectionHeaderContainer: {
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 4,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  image: {
    width: 48,
    height: 48,
    borderRadius: 8,
    marginRight: 12,
  },
  placeholderImage: {
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contentContainer: {
    flex: 1,
    marginRight: 8,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#222',
    marginBottom: 4,
    lineHeight: 20,
  },
  itemSubtitle: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  timestamp: {
    fontSize: 12,
    color: '#999',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#222',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },
});

export default ActivityScreen;
