import React from 'react';
import { ScrollView, Text, StyleSheet } from 'react-native';

const PrivacyPolicyScreen = () => {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Privacy Policy</Text>
      <Text style={styles.updated}>Last updated: April 25, 2025</Text>

      <Text style={styles.section}>
        At Stogora, we value your privacy. This Privacy Policy outlines how we collect, use, and protect your personal information.
      </Text>

      <Text style={styles.heading}>Information We Collect</Text>
      <Text style={styles.bullet}>• Email address and name when you sign up</Text>
      <Text style={styles.bullet}>• Payment details via Stripe (we never store card info)</Text>
      <Text style={styles.bullet}>• Livestream activity and order history</Text>
      <Text style={styles.bullet}>• Device and usage data for performance and analytics</Text>

      <Text style={styles.heading}>How We Use Your Information</Text>
      <Text style={styles.bullet}>• To provide our marketplace and livestreaming platform</Text>
      <Text style={styles.bullet}>• To process orders and enable payments</Text>
      <Text style={styles.bullet}>• To detect fraud and improve security</Text>
      <Text style={styles.bullet}>• To personalize your experience</Text>

      <Text style={styles.heading}>Data Sharing</Text>
      <Text style={styles.section}>
        We only share data with trusted third parties like Stripe, Firebase, and Agora to power core platform functionality. We never sell your data.
      </Text>

      <Text style={styles.heading}>Your Rights</Text>
      <Text style={styles.section}>
        You can update your data or delete your account at any time by contacting us at support@stogora.shop.
      </Text>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 8 },
  updated: { fontSize: 14, color: '#888', marginBottom: 16 },
  heading: { fontSize: 18, fontWeight: '600', marginTop: 20, marginBottom: 8 },
  section: { fontSize: 16, lineHeight: 24, marginBottom: 12 },
  bullet: { fontSize: 16, lineHeight: 24, marginLeft: 10, marginBottom: 4 },
});

export default PrivacyPolicyScreen;
