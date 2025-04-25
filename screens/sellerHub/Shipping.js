import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import CustomHeader from '../../components/CustomHeader';

const Shipping = () => {
  const navigation = useNavigation();

  const handleGoToShippo = () => {
    Linking.openURL('https://apps.goshippo.com/');
  };

  return (
    <View style={styles.container}>
      <CustomHeader title="Shipping" showBack onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Shipping Guide</Text>

        <Text style={styles.paragraph}>
          When you sell a product on our platform, it's your responsibility to ship the item to the buyer promptly. We've made it easy for you to do this by integrating with GoShippo, a platform that gives you access to discounted shipping rates.
        </Text>

        <Text style={styles.sectionTitle}>💸 Save 30–50% on Shipping</Text>
        <Text style={styles.paragraph}>
          By using GoShippo, you can save up to 50% on shipping labels compared to retail rates. These savings can make a huge difference over time, especially if you're shipping multiple products.
        </Text>

        <Text style={styles.sectionTitle}>🚚 How to Ship Your Product</Text>
        <Text style={styles.paragraph}>
          1. Go to your Orders tab and tap on the order you want to ship.{'\n\n'}
          2. Tap “Manage Shipping Label” to open the shipping label screen for that order.{'\n\n'}
          3. Review the buyer’s shipping address. Enter the package weight and dimensions.{'\n\n'}
          4. Tap “Buy Shipping Label” to be redirected to GoShippo. Log in or create an account there if you haven’t yet.{'\n\n'}
          5. Once you purchase the label, enter the tracking number back in the app to save it and notify the buyer.
        </Text>

        <Text style={styles.sectionTitle}>📦 Pro Tips</Text>
        <Text style={styles.paragraph}>
          • Use accurate weight and dimensions to avoid overcharges or delays.{'\n'}
          • Include a packing slip if you'd like — you can print one from the order screen.{'\n'}
          • Save your packaging preferences in GoShippo to streamline future shipments.
        </Text>

        <TouchableOpacity style={styles.button} onPress={handleGoToShippo}>
          <Text style={styles.buttonText}>Open GoShippo</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 20, paddingBottom: 60 },
  title: { fontSize: 26, fontWeight: 'bold', marginBottom: 20, color: '#000' },
  sectionTitle: { fontSize: 20, fontWeight: '600', marginTop: 20, marginBottom: 8, color: '#E76A54' },
  paragraph: { fontSize: 16, lineHeight: 24, color: '#333' },
  button: {
    marginTop: 30,
    backgroundColor: '#E76A54',
    padding: 16,
    borderRadius: 32,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});

export default Shipping;
