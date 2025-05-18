import 'react-native-get-random-values'; // ✅ must be first
import React, { useEffect, useState } from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { StripeProvider } from "@stripe/stripe-react-native";
import 'react-native-reanimated';
import * as Linking from "expo-linking";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LogBox } from "react-native";

// Context & Firebase
import { AppProvider } from "./context/AppContext";
import { auth } from "./firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";

// Screens
import OnboardingScreen from "./components/OnboardingScreen";
import LoginScreen from "./screens/LoginScreen";
import SignupScreen from "./screens/SignupScreen";
import BottomTabs from "./screens/BottomTabs";
import SellerDetailsScreen from "./screens/SellerDetailsScreen";
import CreateProductScreen from "./screens/CreateProduct";
import ProductDetailsScreen from "./screens/ProductDetailsScreen";
import HomeScreen from "./screens/homeScreen/HomeScreen";
import BrowseScreen from "./screens/BrowseScreen";
import SellerAccountTabs from "./screens/SellerAccountTabs";
import AccountScreen from "./screens/AccountScreen";
import SellerHub from "./screens/SellerHub";
import Inventory from "./screens/sellerHub/Inventory";
import ProfileScreen from "./screens/ProfileScreen";
import ViewerScreen from "./screens/Viewer/ViewerScreen";
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
import PreStreamSetup from "./screens/broadcaster/PreStreamSetup";
import BroadcasterScreen from "./screens/broadcaster/BroadcasterScreen";
import Order from "./screens/sellerHub/Order";
import Notifications from './screens/account/Notifications';
import ShippingLabelScreen from "./screens/sellerHub/ShippingLabelScreen";
import DeleteAccount from "./screens/account/DeleteAccountScreen";
import AccountInfo from "./screens/account/AccountInfoScreen";
import TermsOfUseScreen from "./screens/account/TermsOfUseScreen";
import PrivacyPolicyScreen from "./screens/account/PrivacyPolicyScreen";
import MessagesScreen from "./screens/account/MessagesScreen";
import InboxScreen from "./screens/account/InboxScreen";
import ScheduleStreamScreen from "./screens/schedule/ScheduleStreamScreen";
import ScheduledStreams from "./screens/schedule/ScheduledStreams";
import EditScheduledStream from "./screens/schedule/EditScheduledStream";
import EditProductScreen from "./screens/sellerHub/EditProductScreen";
import OrderDetailsScreen from "./screens/OrderDetailsScreen";
import ScheduleProductQueue from './screens/schedule/ScheduleProductQueue';
import EventDetails from "./screens/schedule/EventDetails";
import BrowsePage from "./screens/spinner/BrowsePage";


const linking = {
  prefixes: ["roundtwo://"],
  config: {
    screens: {
      PayoutScreen: {
        path: "onboarding-success",
      },
      SellerHub: {
        path: "payout-refresh",
        exact: true,
      },
    },
  },
};

LogBox.ignoreLogs([
  "FirebaseRecaptcha: Support for defaultProps will be removed from function components"
]);

const Stack = createStackNavigator();

export default function App() {
  const [authReady, setAuthReady] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(null);

  useEffect(() => {
    const checkOnboarding = async () => {
      const seen = await AsyncStorage.getItem('hasSeenOnboarding');
      setShowOnboarding(seen !== 'true');
    };

    const unsubscribe = onAuthStateChanged(auth, () => {
      setAuthReady(true);
    });

    checkOnboarding();

    return () => unsubscribe();
  }, []);

  if (!authReady || showOnboarding === null) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StripeProvider publishableKey="pk_live_51LLWUzBDUXSD1c3Fa4lsPeJDWhC5qUP5glNZ8hA2BipifgqkdPXFTix9FUo09uggUbt6g8dAEYvlPeOCNKOY7vWa00iYYSzcCy">
        <AppProvider>
          <NavigationContainer linking={linking}>
            <Stack.Navigator
              screenOptions={{
                headerTintColor: "#E76A54",
                headerTitleStyle: {
                  color: "#222",
                  fontWeight: "bold",
                },
              }}
              initialRouteName={showOnboarding ? "Onboarding" : "Signup"}
            >
              {showOnboarding && (
                <Stack.Screen
                  name="Onboarding"
                  component={OnboardingScreen}
                  options={{ headerShown: false }}
                />
              )}
              <Stack.Screen name="Signup" component={SignupScreen} options={{ headerShown: false, gestureEnabled: false }} />
              <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false, gestureEnabled: false }} />
              <Stack.Screen name="MainApp" component={BottomTabs} options={{ headerShown: false }} />
              <Stack.Screen name="SellerDetailsScreen" component={SellerDetailsScreen} options={{ headerShown: false }} />
              <Stack.Screen name="CreateProductScreen" component={CreateProductScreen} options={{ headerShown: false }} />
              <Stack.Screen name="HomeScreen" component={HomeScreen} options={{ headerShown: false }} />
              <Stack.Screen name="BrowseScreen" component={BrowseScreen} options={{ headerShown: false }} />
              <Stack.Screen name="ProductDetailsScreen" component={ProductDetailsScreen} options={{ headerShown: false }} />
              <Stack.Screen name="SellerAccountTabs" component={SellerAccountTabs} options={{ title: "Seller Account", headerShown: false }} />
              <Stack.Screen name="Account" component={AccountScreen} options={{ title: "Account" }} />
              <Stack.Screen name="SellerHub" component={SellerHub} options={{ title: "Seller Hub" }} />
              <Stack.Screen name="ViewerScreen" component={ViewerScreen} options={{ headerShown: false, gestureEnabled: false }} />
              <Stack.Screen name="Inventory" component={Inventory} options={{ title: "My Inventory", headerShown: false }} />
              <Stack.Screen name="ProfileScreen" component={ProfileScreen} options={{ title: "Profile", headerShown: false }} />
              <Stack.Screen name="PaymentsShipping" component={PaymentsShipping} options={{ headerShown: false }} />
              <Stack.Screen name="AddShippingAddress" component={AddShippingAddress} options={{ title: "Add Shipping Address", presentation: "modal" }} />
              <Stack.Screen name="ConfirmAddress" component={ConfirmAddress} options={{ title: "Confirm Address", presentation: "modal" }} />
              <Stack.Screen name="AddressesScreen" component={AddressesScreen} options={{ headerShown: false }} />
              <Stack.Screen name="PayoutScreen" component={PayoutScreen} options={{ headerShown: false }} />
              <Stack.Screen name="Transactions" component={TransactionsScreen} />
              <Stack.Screen name="SellerVerificationScreen" component={SellerVerificationScreen} options={{ title: "Verify Seller", headerShown: false }} />
              <Stack.Screen name="ChangeEmail" component={ChangeEmail} options={{ headerShown: false }} />
              <Stack.Screen name="ChangePassword" component={ChangePassword} options={{ headerShown: false }} />
              <Stack.Screen name="AccountInfo" component={AccountInfo} options={{ headerShown: false }} />
              <Stack.Screen name="DeleteAccount" component={DeleteAccount} options={{ headerShown: false }} />
              <Stack.Screen name="VerifyPhone" component={VerifyPhone} options={{ presentation: "modal", headerShown: false }} />
              <Stack.Screen name="VerifyIdentity" component={VerifyIdentity} options={{ title: "Verify Identity" }} />
              <Stack.Screen name="PreStreamSetup" component={PreStreamSetup} options={{ headerShown: false }} />
              <Stack.Screen name="BroadcasterScreen" component={BroadcasterScreen} options={{ headerShown: false, gestureEnabled: false }} />
              <Stack.Screen name="Order" component={Order} options={{ title: "Orders" }} />
              <Stack.Screen name="Notifications" component={Notifications} options={{ headerShown: false }} />
              <Stack.Screen name="MessagesScreen" component={MessagesScreen} options={{ headerShown: false }} />
              <Stack.Screen name="InboxScreen" component={InboxScreen} options={{ headerShown: false }} />
              <Stack.Screen name="ShippingLabelScreen" component={ShippingLabelScreen} options={{ title: "Shipping Label" }} />
              <Stack.Screen name="Shipping" component={require('./screens/sellerHub/Shipping').default} options={{ headerShown: false }} />
              <Stack.Screen name="AffiliateProgram" component={require('./screens/sellerHub/AffiliateProgram').default} options={{ headerShown: false }} />
              <Stack.Screen name="CottageLaws" component={require('./screens/sellerHub/CottageLaws').default} options={{ headerShown: false }} />
              <Stack.Screen name="TermsOfUse" component={TermsOfUseScreen} options={{ title: "Verify Identity" }} />
              <Stack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} options={{ title: "Privacy Policy" }} />
              <Stack.Screen name="ScheduleStream" component={ScheduleStreamScreen} options={{ headerShown: false }} />
              <Stack.Screen name="ScheduledStreams" component={ScheduledStreams} options={{ headerShown: false }} />
              <Stack.Screen name="EditScheduledStream" component={EditScheduledStream} options={{ headerShown: false }} />
              <Stack.Screen name="ScheduleProductQueue" component={ScheduleProductQueue} options={{ headerShown: false }} />
              <Stack.Screen name="EventDetails" component={EventDetails} options={{ headerShown: false }} />
              <Stack.Screen name="EditProductScreen" component={EditProductScreen} options={{ headerShown: false }} />
              <Stack.Screen name="OrderDetailsScreen" component={OrderDetailsScreen} options={{ title: "Order Details" }} />
              <Stack.Screen 
                name="BrowsePage" 
                component={BrowsePage} 
                options={{ 
                  headerShown: false,
                  presentation: 'modal'
                }} 
              />
            </Stack.Navigator>
          </NavigationContainer>
        </AppProvider>
      </StripeProvider>
    </GestureHandlerRootView>
  );
}
