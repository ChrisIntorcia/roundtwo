import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  TouchableOpacity,
  ActivityIndicator,
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
import CustomHeader from "../components/CustomHeader";

const db = getFirestore();

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
  return "Earlier";
};

const ActivityScreen = ({ navigation }) => {
  const [sections, setSections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [displayLimit, setDisplayLimit] = useState(8);
  const currentUser = auth.currentUser;

  useEffect(() => {
    if (!currentUser) return;

    const fetchData = async () => {
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
            title: `You purchased "${data.title}"`,
            image: data.image || null,
            onPress: () => {},
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
            image: null,
            onPress: () => navigation.navigate("Order"),
          });
        }

        for (const docSnap of productsSnap.docs) {
          const data = docSnap.data();
          if (followingIds.includes(data.sellerId)) {
            activityItems.push({
              type: "newProduct",
              timestamp: data.createdAt?.toDate?.() || new Date(),
              title: `New product listed: "${data.title}"`,
              image: data.images?.[0] || null,
              onPress: () =>
                navigation.navigate("ProductDetail", { productId: docSnap.id }),
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
            image: userDoc.data()?.avatarUrl || null,
            onPress: () =>
              navigation.navigate("MessagesScreen", {
                otherUserId: otherId,
                otherUsername: username,
              }),
          });
        }

        const grouped = activityItems.reduce((acc, item) => {
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
        console.error("🔥 Failed to fetch activity:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [displayLimit]);

  const loadMoreItems = () => {
    setDisplayLimit((prev) => prev + 8);
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity onPress={item.onPress} style={styles.item}>
      {item.image ? (
        <FastImage source={{ uri: item.image }} style={styles.image} />
      ) : (
        <View style={[styles.image, { backgroundColor: "#ccc" }]} />
      )}
      <View style={{ flex: 1 }}>
        <Text style={styles.itemText}>{item.title}</Text>
        <Text style={styles.timestamp}>
          {item.timestamp.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <CustomHeader title="Your Activity" />
      {loading ? (
        <ActivityIndicator size="large" color="#E76A54" style={{ marginTop: 40 }} />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(_, i) => String(i)}
          renderItem={renderItem}
          onEndReached={loadMoreItems}
          onEndReachedThreshold={0.5}
          renderSectionHeader={({ section: { title } }) => (
            <Text style={styles.sectionHeader}>{title}</Text>
          )}
          contentContainerStyle={{ padding: 16 }}
          ListEmptyComponent={
            <Text style={{ textAlign: "center", marginTop: 40 }}>
              No activity yet
            </Text>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  sectionHeader: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 20,
    marginBottom: 8,
    color: "#333",
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 14,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderColor: "#eee",
  },
  image: {
    width: 52,
    height: 52,
    borderRadius: 8,
    marginRight: 12,
  },
  itemText: { fontSize: 15, fontWeight: "500" },
  timestamp: { fontSize: 12, color: "#888", marginTop: 4 },
});

export default ActivityScreen;
