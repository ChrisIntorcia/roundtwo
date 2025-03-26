import React, { useEffect, useState } from "react";
import { 
  View, Text, FlatList, Image, StyleSheet, TouchableOpacity, 
  Modal, TextInput, Button 
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { getFirestore, collection, onSnapshot, doc, getDoc, setDoc } from "firebase/firestore";
import { auth } from "../firebaseConfig"; // Ensure auth is correctly imported

const db = getFirestore();

const HomeScreen = () => {
  const [products, setProducts] = useState([]);
  const [username, setUsername] = useState("");
  const [showPopup, setShowPopup] = useState(false);
  const navigation = useNavigation();

  useEffect(() => {
    // Fetch products
    const unsubscribe = onSnapshot(collection(db, "products"), (snapshot) => {
      const productList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setProducts(productList);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // Check if user has a username
    const checkUsername = async () => {
      const user = auth.currentUser;
      if (user) {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const userData = userSnap.data();
          if (!userData.username) {
            setShowPopup(true);
          }
        }
      }
    };

    checkUsername();
  }, []);

  const handleSetUsername = async () => {
    const user = auth.currentUser;
    if (user && username.trim()) {
      const userRef = doc(db, "users", user.uid);
      await setDoc(userRef, { username }, { merge: true });
      setShowPopup(false);
    }
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.productCard}
      onPress={() => navigation.navigate("ProductDetailsScreen", { product: item })}
    >
      <Image source={{ uri: item.images[0] }} style={styles.image} />
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

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Latest Products</Text>
      <FlatList
        data={products}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={{ paddingBottom: 20 }}
      />

      {/* Username Popup Modal */}
      <Modal visible={showPopup} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Choose a Username</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter username"
              value={username}
              onChangeText={setUsername}
            />
            <Button title="Save" onPress={handleSetUsername} />
          </View>
        </View>
      </Modal>
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
  // Modal styles
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    backgroundColor: "white",
    padding: 20,
    borderRadius: 10,
    width: "80%",
    alignItems: "center",
  },
  modalTitle: { fontSize: 18, fontWeight: "bold", marginBottom: 10 },
  input: { borderWidth: 1, borderColor: "#ccc", padding: 8, width: "100%", marginBottom: 10 },
});

export default HomeScreen;
