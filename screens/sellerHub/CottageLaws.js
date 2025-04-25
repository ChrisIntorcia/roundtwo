import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import CustomHeader from '../../components/CustomHeader';

const CottageLaws = () => {
  const navigation = useNavigation();

  return (
    <View style={styles.container}>
      <CustomHeader title="Cottage Laws & Markets" showBack onBack={() => navigation.goBack()} />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Understanding Cottage Food Laws & Farmers Markets</Text>

        <Text style={styles.paragraph}>
          Cottage food laws are state-level regulations that allow individuals to prepare and sell low-risk foods from their homes or at farmers markets without needing a commercial kitchen or food facility license.
        </Text>

        <Text style={styles.sectionTitle}>🛒 What Are Cottage Foods?</Text>
        <Text style={styles.paragraph}>
          Cottage foods generally include non-potentially hazardous foods that don't require refrigeration. Examples include baked goods, jams, jellies, granola, dried herbs, honey, and certain candies.
        </Text>

        <Text style={styles.sectionTitle}>📍 State-by-State Rules</Text>
        <Text style={styles.paragraph}>
          Each U.S. state has its own cottage food regulations. Some states allow online sales and shipping, while others limit sales to direct, in-person transactions at farmers markets or home pickup. Always check your state’s Department of Health or Agriculture website for the latest information.
        </Text>

        <Text style={styles.sectionTitle}>🌐 Selling Online</Text>
        <Text style={styles.paragraph}>
          A growing number of states are beginning to allow cottage food sellers to take orders online, and in some cases, even ship products within the state. However, most laws prohibit interstate shipping due to federal FDA regulations unless the producer has a commercial license.
        </Text>

        <Text style={styles.sectionTitle}>👨‍🌾 Farmers Markets</Text>
        <Text style={styles.paragraph}>
          Farmers markets are a traditional venue for cottage food sellers. Most markets will require a booth fee, food handler’s certification, and product labeling that complies with local rules. Some will also require liability insurance.
        </Text>

        <Text style={styles.sectionTitle}>✅ What You Can Typically Sell</Text>
        <Text style={styles.paragraph}>Allowed items vary by state but often include:</Text>
        <Text style={styles.bullet}>• Breads, muffins, cookies, and cakes (without cream)</Text>
        <Text style={styles.bullet}>• Fruit preserves and jams</Text>
        <Text style={styles.bullet}>• Dry mixes and spice blends</Text>
        <Text style={styles.bullet}>• Popcorn, granola, and trail mix</Text>
        <Text style={styles.bullet}>• Herbal teas and dry pasta</Text>

        <Text style={styles.sectionTitle}>⚠️ What You Usually Can't Sell</Text>
        <Text style={styles.bullet}>• Meat or poultry products</Text>
        <Text style={styles.bullet}>• Dairy products (unless shelf-stable)</Text>
        <Text style={styles.bullet}>• Pickles, fermented foods (in some states)</Text>
        <Text style={styles.bullet}>• Products requiring refrigeration</Text>

        <Text style={styles.sectionTitle}>📝 Labeling Requirements</Text>
        <Text style={styles.paragraph}>Most states require labeling that includes:</Text>
        <Text style={styles.bullet}>• Your name and address</Text>
        <Text style={styles.bullet}>• The name of the product</Text>
        <Text style={styles.bullet}>• Ingredients (in descending order by weight)</Text>
        <Text style={styles.bullet}>• A disclaimer like “This product was made in a home kitchen not inspected by the health department.”</Text>

        <Text style={styles.sectionTitle}>📚 Final Tips</Text>
        <Text style={styles.paragraph}>
          Always double-check with your state’s health department. Laws are frequently updated and vary widely. Consider joining a local cottage food association or network to stay informed and connect with other makers.
        </Text>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 20, paddingBottom: 80 },
  title: { fontSize: 26, fontWeight: 'bold', marginBottom: 20, color: '#000' },
  sectionTitle: { fontSize: 20, fontWeight: '600', marginTop: 20, marginBottom: 8, color: '#E76A54' },
  paragraph: { fontSize: 16, lineHeight: 24, color: '#333', marginBottom: 10 },
  bullet: { fontSize: 16, color: '#333', paddingLeft: 12, marginBottom: 6 },
});

export default CottageLaws;
