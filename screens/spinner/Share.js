// Share.js
import React, { useState } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Share
} from 'react-native';
import * as Clipboard from 'expo-clipboard';

const GENERIC_MESSAGE =
  "🎉 We're giving away amazing prizes on Stogora! Spin the wheel for a chance to win. Download the app and join now!";

export default function ShareButton({ onShare }) {
  const [loading, setLoading] = useState(false);
  const [shared, setShared] = useState(false);

  const handlePress = async () => {
    try {
      setLoading(true);
      const result = await Share.share({ message: GENERIC_MESSAGE });

      if (result.action === Share.sharedAction) {
        setShared(true);
        onShare?.(); // Call the onShare callback if provided
      }
      // if result.action === Share.dismissedAction, user cancelled
    } catch (error) {
      // fallback: copy to clipboard
      Clipboard.setString(GENERIC_MESSAGE);
      Alert.alert(
        "Copied to Clipboard",
        "Couldn't open share dialog. Message copied to your clipboard."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.button,
        shared && styles.buttonShared
      ]}
      onPress={handlePress}
      disabled={loading}
    >
      {loading ? (
        <ActivityIndicator color="#fff" />
      ) : (
        <Text style={styles.text}>
          {shared ? 'Shared!' : 'Share to Win'}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#E76A54',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#E76A54',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  buttonShared: {
    backgroundColor: '#213E4D',
  },
  text: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
