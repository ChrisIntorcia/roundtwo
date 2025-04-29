import 'react-native-get-random-values'; // ✅ must be first
import React, { useEffect, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StripeProvider } from "@stripe/stripe-react-native";
import 'react-native-reanimated';
import * as Linking from "expo-linking";
import MessagesScreen from "./screens/account/MessagesScreen";
import InboxScreen from "./screens/account/InboxScreen";
import { LogBox } from "react-native";

// Screens
import OnboardingScreen from "./components/OnboardingScreen";
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
import Order from "./screens/sellerHub/Order";
import Notifications from './screens/account/Notifications';
import ShippingLabelScreen from "./screens/sellerHub/ShippingLabelScreen";
import DeleteAccount from "./screens/account/DeleteAccountScreen";
import AccountInfo from "./screens/account/AccountInfoScreen";

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

// hide that specific recaptcha warning
LogBox.ignoreLogs([
  "FirebaseRecaptcha: Support for defaultProps will be removed from function components"
]);

const Stack = createStackNavigator();

export default function App() {
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setAuthReady(true);
    });

    return () => unsubscribe();
  }, []);

  if (!authReady) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StripeProvider
        publishableKey="pk_live_51LLWUzBDUXSD1c3Fa4lsPeJDWhC5qUP5glNZ8hA2BipifgqkdPXFTix9FUo09uggUbt6g8dAEYvlPeOCNKOY7vWa00iYYSzcCy"
      >
        <AppProvider>
          <NavigationContainer linking={linking}>
          <Stack.Navigator
            screenOptions={{
              headerTintColor: "#E76A54", // ✅ green back arrow
              headerTitleStyle: {
                color: "#222", // ✅ dark title (match your design)
                fontWeight: "bold",
              },
            }} >
              <Stack.Screen name="Onboarding" component={OnboardingScreen} options={{ headerShown: false }} />
              <Stack.Screen name="Signup" component={SignupScreen} options={{ headerShown: false , gestureEnabled: false }} />
              <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false , gestureEnabled: false }} />
              <Stack.Screen name="MainApp" component={BottomTabs} options={{ headerShown: false }} />
              <Stack.Screen name="SellerDetailsScreen" component={SellerDetailsScreen} options={{ headerShown: false }}  />
              <Stack.Screen name="CreateProductScreen" component={CreateProductScreen} options={{ headerShown: false }}/>
              <Stack.Screen name="HomeScreen" component={HomeScreen} options={{ headerShown: false }} />
              <Stack.Screen name="BrowseScreen" component={BrowseScreen} options={{ headerShown: false}} />
              <Stack.Screen name="ProductDetailsScreen" component={ProductDetailsScreen} options={{ title: "Product Details" }} />
              <Stack.Screen name="SellerAccountTabs" component={SellerAccountTabs} options={{ title: "Seller Account", headerShown: false }} />
              <Stack.Screen name="Account" component={AccountScreen} options={{ title: "Account" }} />
              <Stack.Screen name="SellerHub" component={SellerHub} options={{ title: "Seller Hub" }} />
              <Stack.Screen name="ViewerScreen" component={ViewerScreen} options={{headerShown: false, gestureEnabled: false}} />
              <Stack.Screen name="Inventory" component={Inventory} options={{ title: "My Inventory", headerShown: false }} />
              <Stack.Screen name="ProfileScreen" component={ProfileScreen} options={{ title: "Profile" , headerShown: false  }} />
              <Stack.Screen name="PaymentsShipping" component={PaymentsShipping} options={{ headerShown: false }} />
              <Stack.Screen name="AddShippingAddress" component={AddShippingAddress} options={{ title: "Add Shipping Address", presentation: "modal" }} />
              <Stack.Screen name="ConfirmAddress" component={ConfirmAddress} options={{ title: "Confirm Address", presentation: "modal" }} />
              <Stack.Screen name="AddressesScreen" component={AddressesScreen} options={{ headerShown: false }} />
              <Stack.Screen name="PayoutScreen" component={PayoutScreen} options={{ headerShown: false }} />
              <Stack.Screen name="Transactions" component={TransactionsScreen} />
              <Stack.Screen name="SellerVerificationScreen" component={SellerVerificationScreen} options={{ title: "Verify Seller", headerShown: false}} />
              <Stack.Screen name="ChangeEmail" component={ChangeEmail} options={{ headerShown: false }} />
              <Stack.Screen name="ChangePassword" component={ChangePassword} options={{ headerShown: false }} />
              <Stack.Screen name="AccountInfo" component={AccountInfo} options={{ headerShown: false }} />
              <Stack.Screen name="DeleteAccount" component={DeleteAccount} options={{ headerShown: false }} />
              <Stack.Screen name="VerifyPhone" component={VerifyPhone} options={{ presentation: "modal", headerShown: false }} />
              <Stack.Screen name="VerifyIdentity" component={VerifyIdentity} options={{ title: "Verify Identity" }} />
              <Stack.Screen name="PreStreamSetup" component={PreStreamSetup} options={{ headerShown: false }} />
              <Stack.Screen name="BroadcasterScreen" component={BroadcasterScreen} options={{ headerShown: false , gestureEnabled: false }} />
              <Stack.Screen name="Order" component={Order} options={{ title: "Orders" }} />
              <Stack.Screen name="Notifications" component={Notifications} />
              <Stack.Screen name="MessagesScreen" component={MessagesScreen} options={({ route }) => ({ title: route.params?.otherUsername || "Chat" })} />
              <Stack.Screen name="InboxScreen" component={InboxScreen} options={{ title: "Inbox" }} /> 
              <Stack.Screen name="ShippingLabelScreen" component={ShippingLabelScreen} options={{ title: "Shipping Label" }} />
              <Stack.Screen name="Shipping" component={require('./screens/sellerHub/Shipping').default} options={{ headerShown: false }} />
              <Stack.Screen name="AffiliateProgram" component={require('./screens/sellerHub/AffiliateProgram').default} options={{ headerShown: false }} />
              <Stack.Screen name="CottageLaws" component={require('./screens/sellerHub/CottageLaws').default} options={{ headerShown: false }} />
            </Stack.Navigator>
          </NavigationContainer>
        </AppProvider>
      </StripeProvider>
    </GestureHandlerRootView>
  );
}
