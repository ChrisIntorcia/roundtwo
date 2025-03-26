import React, { useState, useContext } from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, Animated, PanResponder } from "react-native";
import HomeScreen from "./HomeScreen";
import BrowseScreen from "./BrowseScreen";
import ActivityScreen from "./ActivityScreen";
import AccountScreen from "./AccountScreen";
import { AppContext } from "../context/AppContext";
import SellerHub from "./SellerHub";


const Tab = createBottomTabNavigator();

const BottomTabs = ({ navigation }) => {
  const { isSeller } = useContext(AppContext);
  const [isSellerModalVisible, setSellerModalVisible] = useState(false);
  const [isBuyerModalVisible, setBuyerModalVisible] = useState(false);
  const translateY = new Animated.Value(0);

  // PanResponder for swipe to dismiss on both modals
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
    console.log("Opening bottom sheet...");
    if (isSeller) {
      setSellerModalVisible(true);
    } else {
      setBuyerModalVisible(true);
    }
  };

  const closeModals = () => {
    console.log("Closing modals");
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
        <Tab.Screen name="Browse" component={BrowseScreen} />
        <Tab.Screen
          name="Sell"
          options={{
            tabBarButton: (props) => (
              <TouchableOpacity {...props} style={styles.sellButton} onPress={openBottomSheet}>
                <Ionicons name="add-circle" size={30} color="blue" />
              </TouchableOpacity>
            ),
            tabBarLabel: "",
          }}
        >
          {() => null}
        </Tab.Screen>
        <Tab.Screen name="Activity" component={ActivityScreen} />
        <Tab.Screen name="Account" component={AccountScreen} />
      </Tab.Navigator>

      {/* Buyer Bottom Sheet */}
      <Modal animationType="slide" transparent visible={isBuyerModalVisible} onRequestClose={closeModals}>
        <View style={styles.modalOverlay} {...panResponder.panHandlers}>
          <Animated.View style={[styles.bottomSheet, { transform: [{ translateY }] }]}>
            <ScrollView>
              <Text style={styles.modalTitle}>Complete Seller Setup</Text>
              <Text style={styles.bulletPoint}> 🔹 <Text style={styles.boldText}>Sell in seconds, not days or weeks</Text>: Selling live means selling fast.</Text>
              <Text style={styles.bulletPoint}> 🔹 <Text style={styles.boldText}>Keep more of what you earn</Text>: Whatnot's 8% commission is one of the lowest in the industry.</Text>
              <Text style={styles.bulletPoint}> 🔹 <Text style={styles.boldText}>Sell to the best buyers in the business</Text>: Livestream shoppers are more engaged.</Text>
              <TouchableOpacity style={styles.blueButton} onPress={() => { closeModals(); navigation.navigate("SellerDetailsScreen"); }}>
                <Text style={styles.optionButtonText}>Continue</Text>
              </TouchableOpacity>
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>

      {/* Seller Bottom Sheet */}
      <Modal animationType="slide" transparent visible={isSellerModalVisible} onRequestClose={closeModals}>
        <View style={styles.modalOverlay} {...panResponder.panHandlers}>
          <Animated.View style={[styles.bottomSheet, { transform: [{ translateY }] }]}>
            <ScrollView>
              <Text style={styles.modalTitle}>Seller Options</Text>
              <TouchableOpacity style={styles.blueButton} onPress={() => { closeModals(); navigation.navigate("CreateProductScreen"); }}>
                <Text style={styles.optionButtonText}>Create a Product</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.blueButton} onPress={() => navigation.navigate("ScheduleShowScreen")}>
                <Text style={styles.optionButtonText}>Schedule a Show</Text>
              </TouchableOpacity>
              <TouchableOpacity 
  style={styles.blueButton} 
  onPress={() => {
    closeModals(); 
    navigation.navigate("MainApp", { screen: "Account", params: { screen: "SellerHub" } });
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
  bottomSheet: { width: "100%", backgroundColor: "white", borderRadius: 12, padding: 20, alignItems: "center", height: "40%" },
  modalTitle: { fontSize: 20, fontWeight: "bold", marginBottom: 15, textAlign: "center" },
  blueButton: { width: "100%", backgroundColor: "blue", padding: 15, borderRadius: 10, marginVertical: 10, alignItems: "center" },
  optionButtonText: { color: "white", fontWeight: "bold", fontSize: 16 },
  bulletPoint: { marginVertical: 10, color: "#555", fontSize: 16 },
  boldText: { fontWeight: "bold" },
});

export default BottomTabs;
