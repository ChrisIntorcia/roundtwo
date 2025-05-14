import React, { useState, useContext, useEffect } from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Animated,
  PanResponder,
} from "react-native";
import HomeScreen from "./homeScreen/HomeScreen";
import BrowsePage from "../screens/spinner/BrowsePage";
import ActivityScreen from "./ActivityScreen";
import AccountScreen from "./AccountScreen";
import { AppContext } from "../context/AppContext";
import SellerHub from "./SellerHub";
import { getAuth } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebaseConfig";
import { useNavigation } from "@react-navigation/native"; // ✅ root nav access

const Tab = createBottomTabNavigator();

const BottomTabs = ({ navigation }) => {
  const rootNavigation = useNavigation(); // ✅ root stack navigation
  const { isSeller } = useContext(AppContext);
  const [isSellerModalVisible, setSellerModalVisible] = useState(false);
  const [isBuyerModalVisible, setBuyerModalVisible] = useState(false);
  const [sellerSetupComplete, setSellerSetupComplete] = useState(false);
  const translateY = new Animated.Value(0);

  useEffect(() => {
    const checkSellerDetails = async () => {
      try {
        const user = getAuth().currentUser;
        if (!user) return;

        const docRef = doc(db, "sellerDetails", user.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setSellerSetupComplete(true);
        } else {
          setSellerSetupComplete(false);
        }
      } catch (err) {
      }
    };

    checkSellerDetails();
  }, []);

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderMove: (evt, gestureState) => {
      if (gestureState.dy > 50) {
        closeModals();
      }
    },
  });

  const openBottomSheet = () => {
    if (isSeller) {
      setSellerModalVisible(true);
    } else {
      setBuyerModalVisible(true);
    }
  };

  const closeModals = () => {
    Animated.timing(translateY, {
      toValue: 300,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setSellerModalVisible(false);
      setBuyerModalVisible(false);
    });
  };

  return (
    <View style={{ flex: 1 }}>
      <Tab.Navigator
  screenOptions={({ route }) => ({
    headerShown: false, // ✅ hides all headers
    tabBarIcon: ({ focused, color, size }) => {
      let iconName;
      if (route.name === "Home") {
        iconName = focused ? "home" : "home-outline";
      } else if (route.name === "Browse") {
        iconName = focused ? "search" : "search-outline";
      } else if (route.name === "Activity") {
        iconName = focused ? "list" : "list-outline";
      } else if (route.name === "Account") {
        iconName = focused ? "person" : "person-outline";
      }
      return <Ionicons name={iconName} size={size} color={color} />;
    },
    tabBarActiveTintColor: "tomato",
    tabBarInactiveTintColor: "gray",
  })}
      >
        <Tab.Screen name="Home" component={HomeScreen} />
        <Tab.Screen
  name="Prize"
  component={BrowsePage}
  options={{
    tabBarLabel: 'Prize',
    tabBarIcon: ({ color, size }) => (
      <Ionicons name="gift" size={size} color={color} />
    ),
  }}
/>
        {!sellerSetupComplete && (
          <Tab.Screen
            name="Sell"
            options={{
              tabBarButton: (props) => (
                <TouchableOpacity {...props} style={styles.sellButton} onPress={openBottomSheet}>
                  <Ionicons name="add-circle" size={30} color="#E76A54" />
                  <Text style={styles.sellLabel}>Sell</Text>
                </TouchableOpacity>
              ),
              tabBarLabel: "Sell",
            }}
          >
            {() => null}
          </Tab.Screen>
        )}
        <Tab.Screen name="Activity" component={ActivityScreen} />
        <Tab.Screen name="Account" component={AccountScreen} />
      </Tab.Navigator>

      {/* Buyer Modal */}
      <Modal animationType="slide" transparent visible={isBuyerModalVisible} onRequestClose={closeModals}>
        <View style={styles.modalOverlay} {...panResponder.panHandlers}>
          <Animated.View style={[styles.bottomSheet, { transform: [{ translateY }] }]}>
            <ScrollView>
              <Text style={styles.modalTitle}>Complete Seller Setup</Text>
              <Text style={styles.bulletPoint}><Text style={styles.greenDot}>●</Text> <Text style={styles.boldText}>Earn More by Cutting Out the Store</Text>: Sell directly and keep the margins retailers take.</Text>
              <Text style={styles.bulletPoint}><Text style={styles.greenDot}>●</Text> <Text style={styles.boldText}>Share the Margin</Text>: Lower prices for buyers while boosting your profit.</Text>
              <Text style={styles.bulletPoint}><Text style={styles.greenDot}>●</Text> <Text style={styles.boldText}>Build Real Relationships</Text>: Go live, tell your story, and connect face-to-face.</Text>
              <Text style={styles.bulletPoint}><Text style={styles.greenDot}>●</Text> <Text style={styles.boldText}>Educate, Entertain, and Sell</Text>: Demo, teach, and showcase your products live.</Text>

              <TouchableOpacity
                style={styles.blueButton}
                onPress={() => {
                  closeModals();
                  rootNavigation.navigate("SellerDetailsScreen"); // ✅ go to global screen
                }}
              >
                <Text style={styles.optionButtonText}>Continue</Text>
              </TouchableOpacity>
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>

      {/* Seller Modal */}
      <Modal animationType="slide" transparent visible={isSellerModalVisible} onRequestClose={closeModals}>
        <View style={styles.modalOverlay} {...panResponder.panHandlers}>
          <Animated.View style={[styles.bottomSheet, { transform: [{ translateY }] }]}>
            <ScrollView>
              <Text style={styles.modalTitle}>Seller Options</Text>
              <TouchableOpacity
                style={styles.blueButton}
                onPress={() => {
                  closeModals();
                  rootNavigation.navigate("CreateProductScreen"); // ✅ go to stack-level screen
                }}
              >
                <Text style={styles.optionButtonText}>Create a Product</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.blueButton}
                onPress={() => {
                  closeModals();
                  rootNavigation.navigate("ScheduleStream"); // ✅ fixed navigation to hide header
                }}
              >
                <Text style={styles.optionButtonText}>Plan or Go Live</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.blueButton}
                onPress={() => {
                  closeModals();
                  rootNavigation.navigate("MainApp", {
                    screen: "Account",
                    params: { screen: "SellerHub" },
                  });
                }}
              >
                <Text style={styles.optionButtonText}>Seller Hub</Text>
              </TouchableOpacity>
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  sellButton: { justifyContent: "center", alignItems: "center", backgroundColor: "transparent" },
  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0, 0, 0, 0.5)" },
  bottomSheet: { width: "100%", backgroundColor: "white", borderRadius: 12, padding: 20, alignItems: "center" },
  modalTitle: { fontSize: 20, fontWeight: "bold", marginBottom: 15, textAlign: "center" },
  blueButton: { width: "100%", backgroundColor: "#E76A54", paddingVertical: 14, paddingHorizontal: 40, borderRadius: 32, marginVertical: 10, alignItems: "center" },
  optionButtonText: { color: "white", fontWeight: "bold", fontSize: 16 },
  bulletPoint: { marginVertical: 10, color: "#555", fontSize: 16 },
  boldText: { fontWeight: "bold" },
  greenDot: { color: '#E76A54', fontSize: 12 },
});

export default BottomTabs;
