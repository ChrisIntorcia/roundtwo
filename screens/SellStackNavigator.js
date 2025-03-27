import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { GestureHandlerRootView } from "react-native-gesture-handler";

import LoginScreen from "./screens/LoginScreen";
import SignupScreen from "./screens/SignupScreen";
import BottomTabs from "./screens/BottomTabs";
import SellerDetailsScreen from "./screens/SellerDetailsScreen";
import { AppProvider } from "./context/AppContext";
import CreateProductScreen from "./screens/CreateProduct";
import ProductDetailsScreen from "./screens/ProductDetailsScreen";
import HomeScreen from "./screens/HomeScreen"; // ✅ Live stream screen
import BrowseScreen from "./screens/BrowseScreen"; // ✅ Renamed HomeScreen
import SellerAccountTabs from "./screens/SellerAccountTabs";
import AccountScreen from "./screens/AccountScreen";
import SellerHub from "./screens/SellerHub";

const Stack = createStackNavigator();

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AppProvider>
        <NavigationContainer>
          <Stack.Navigator>
            <Stack.Screen name="Signup" component={SignupScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen
              name="MainApp"
              component={BottomTabs}
              options={{ headerShown: false }}
            />
            <Stack.Screen name="SellerDetailsScreen" component={SellerDetailsScreen} />
            <Stack.Screen name="CreateProductScreen" component={CreateProductScreen} />
            <Stack.Screen name="HomeScreen" component={HomeScreen} options={{ headerShown: false }} />
            <Stack.Screen name="BrowseScreen" component={BrowseScreen} options={{ title: "Browse" }} />
            <Stack.Screen name="ProductDetailsScreen" component={ProductDetailsScreen} options={{ title: "Product Details" }} />
            <Stack.Screen name="SellerAccountTabs" component={SellerAccountTabs} options={{ title: "Seller Account", headerShown: false }} />
            <Stack.Screen name="Account" component={AccountScreen} options={{ title: "Account" }} />
            <Stack.Screen name="SellerHub" component={SellerHub} options={{ title: "Seller Hub" }} />
          </Stack.Navigator>
        </NavigationContainer>
      </AppProvider>
    </GestureHandlerRootView>
  );
}
