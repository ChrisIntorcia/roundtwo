import React, { createContext, useState } from "react";

export const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [isSeller, setIsSeller] = useState(false);
  const [ranchName, setRanchName] = useState("");
  const [ranchLocation, setRanchLocation] = useState("");

  const becomeSeller = (name, location) => {
    setIsSeller(true);
    setRanchName(name);
    setRanchLocation(location);
  };

  return (
    <AppContext.Provider
      value={{ isSeller, ranchName, ranchLocation, becomeSeller }}
    >
      {children}
    </AppContext.Provider>
  );
};
