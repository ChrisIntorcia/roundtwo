// AccountStack.js
import React from "react";
import { createStackNavigator } from "@react-navigation/stack";
import AccountScreen from "./AccountScreen";
import SellerHub from "./SellerHub";

const AccountStack = createStackNavigator();

const AccountStackScreen = () => {
  return (
    <AccountStack.Navigator>
      <AccountStack.Screen name="Account" component={AccountScreen} />
      <AccountStack.Screen name="SellerHub" component={SellerHub} />
    </AccountStack.Navigator>
  );
};

export default AccountStackScreen;
