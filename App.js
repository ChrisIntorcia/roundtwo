import 'react-native-get-random-values'; // ✅ must be first
import React, { useEffect, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StripeProvider } from "@stripe/stripe-react-native";
import * as Linking from "expo-linking";

// Screens
import GoLiveScreen from "./screens/GoLiveScreen";
import LoginScreen from "./screens/LoginScreen";
import SignupScreen from "./screens/SignupScreen";
import BottomTabs from "./screens/BottomTabs";
import SellerDetailsScreen from "./screens/SellerDetailsScreen";
import CreateProductScreen from "./screens/CreateProduct";
import ProductDetailsScreen from "./screens/ProductDetailsScreen";
import HomeScreen from "./screens/HomeScreen";
import BrowseScreen from "./screens/BrowseScreen";
import SellerAccountTabs from "./screens/SellerAccountTabs";
import AccountScreen from "./screens/AccountScreen";
import SellerHub from "./screens/SellerHub";
import Inventory from "./screens/sellerHub/Inventory";
import ProfileScreen from "./screens/ProfileScreen";
import ViewerScreen from "./screens/ViewerScreen";
import PaymentsShipping from "./screens/account/PaymentsShipping";
import AddShippingAddress from "./screens/account/AddShippingAddress";
import ConfirmAddress from "./screens/account/ConfirmAddress";
import AddressesScreen from "./screens/account/AddressesScreen";
import PayoutScreen from "./screens/sellerHub/PayoutScreen";
import TransactionsScreen from './screens/sellerHub/TransactionsScreen';
import SellerVerificationScreen from "./screens/sellerHub/SellerVerificationScreen";
import ChangePassword from "./screens/account/ChangePassword";
import ChangeEmail from "./screens/account/ChangeEmail";
import VerifyPhone from "./screens/sellerHub/VerifyPhone";
import VerifyIdentity from "./screens/sellerHub/VerifyIdentity";
import PreStreamSetup from "./screens/PreStreamSetup";
import BroadcasterScreen from "./screens/BroadcasterScreen";

import { AppProvider } from "./context/AppContext";
import { auth } from "./firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";

// ✅ Updated linking config
const linking = {
  prefixes: ["roundtwo://"],
  config: {
    screens: {
      PayoutScreen: "onboarding-success",
    },
  },
};

const Stack = createStackNavigator();

export default function App() {
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log("🔥 Auth state changed:", user?.email || "Logged out");
      setAuthReady(true);
    });

    return () => unsubscribe();
  }, []);

  if (!authReady) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StripeProvider
        publishableKey="pk_test_51LLWUzBDUXSD1c3FLs6vIFKT9eyd0O3ex9yA13jcaDhUJFcabm5VZkPZfCc7rikCWyTeVjZlM7dHXm10IlhoQBKG00g4SsRQfr"
      >
        <AppProvider>
          <NavigationContainer linking={linking}>
            <Stack.Navigator>
              <Stack.Screen name="Signup" component={SignupScreen} />
              <Stack.Screen name="Login" component={LoginScreen} />
              <Stack.Screen name="MainApp" component={BottomTabs} options={{ headerShown: false }} />
              <Stack.Screen name="SellerDetailsScreen" component={SellerDetailsScreen} />
              <Stack.Screen name="CreateProductScreen" component={CreateProductScreen} />
              <Stack.Screen name="HomeScreen" component={HomeScreen} options={{ headerShown: false }} />
              <Stack.Screen name="BrowseScreen" component={BrowseScreen} options={{ headerShown: false}} />
              <Stack.Screen name="ProductDetailsScreen" component={ProductDetailsScreen} options={{ title: "Product Details" }} />
              <Stack.Screen name="SellerAccountTabs" component={SellerAccountTabs} options={{ title: "Seller Account", headerShown: false }} />
              <Stack.Screen name="Account" component={AccountScreen} options={{ title: "Account" }} />
              <Stack.Screen name="SellerHub" component={SellerHub} options={{ title: "Seller Hub" }} />
              <Stack.Screen name="GoLiveScreen" component={GoLiveScreen} options={{headerShown: false}} />
              <Stack.Screen name="ViewerScreen" component={ViewerScreen} options={{headerShown: false}} />
              <Stack.Screen name="Inventory" component={Inventory} options={{ title: "My Inventory" }} />
              <Stack.Screen name="ProfileScreen" component={ProfileScreen} options={{ title: "Profile" }} />
              <Stack.Screen name="PaymentsShipping" component={PaymentsShipping} options={{ headerShown: false }} />
              <Stack.Screen name="AddShippingAddress" component={AddShippingAddress} options={{ title: "Add Shipping Address", presentation: "modal" }} />
              <Stack.Screen name="ConfirmAddress" component={ConfirmAddress} options={{ title: "Confirm Address", presentation: "modal" }} />
              <Stack.Screen name="AddressesScreen" component={AddressesScreen} options={{ headerShown: false  }} />
              <Stack.Screen name="PayoutScreen" component={PayoutScreen} options={{ title: "Payouts" }} />
              <Stack.Screen name="Transactions" component={TransactionsScreen} />
              <Stack.Screen name="SellerVerificationScreen" component={SellerVerificationScreen} options={{ title: "Verify Seller" }} />
              <Stack.Screen name="ChangePassword" component={ChangePassword} options={{ headerShown: false }} />
              <Stack.Screen name="ChangeEmail" component={ChangeEmail} options={{ headerShown: false }} />
              <Stack.Screen name="VerifyPhone" component={VerifyPhone} options={{ presentation: "modal", headerShown: false }} />
              <Stack.Screen name="VerifyIdentity" component={VerifyIdentity} options={{ title: "Verify Identity" }} />
              <Stack.Screen name="PreStreamSetup" component={PreStreamSetup} options={{ headerShown: false }} />
              <Stack.Screen name="BroadcasterScreen" component={BroadcasterScreen} options={{ headerShown: false }} />
            </Stack.Navigator>
          </NavigationContainer>
        </AppProvider>
      </StripeProvider>
    </GestureHandlerRootView>
  );
}
