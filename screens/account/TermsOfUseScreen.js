import React from 'react';
import { ScrollView, Text, StyleSheet } from 'react-native';

const TermsOfUseScreen = () => {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Terms of Service</Text>
      <Text style={styles.updated}>Last updated: April 27, 2025</Text>

      <Text style={styles.section}>
        Welcome to Stogora! By accessing or using our services, you agree to be bound by these Terms of Service ("Terms"). Please read them carefully before using the Stogora website, mobile application, or services ("Services").
      </Text>

      <Text style={styles.section}>
        We do not tolerate any objectionable content or abusive behavior on Stogora. Accounts engaging in such activity may be suspended or terminated without notice.
      </Text>

      <Text style={styles.heading}>1. Account</Text>
      <Text style={styles.section}>
        You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You agree to notify us immediately of any unauthorized use of your account.
      </Text>

      <Text style={styles.heading}>2. Seller Guidelines</Text>
      <Text style={styles.section}>
        Sellers must ensure that all products comply with local, state, and federal laws. Sellers are responsible for providing accurate product descriptions, setting appropriate pricing, fulfilling orders promptly, and handling shipping and delivery.
      </Text>

      <Text style={styles.heading}>3. Buyer Conduct</Text>
      <Text style={styles.section}>
        Buyers agree to only purchase items with the intent to complete payment and to not abuse refund, dispute, or chargeback systems. Fraudulent behavior or abuse of our platform will result in account suspension.
      </Text>

      <Text style={styles.heading}>4. Payments</Text>
      <Text style={styles.section}>
        Payments on Stogora are processed securely through Stripe. Stogora does not store or process your credit card information directly. All financial transactions are subject to Stripe's own terms and policies.
      </Text>

      <Text style={styles.heading}>5. User Content and Conduct</Text>
      <Text style={styles.section}>
        You are solely responsible for any content you upload, stream, or share on Stogora. You agree not to share content that is unlawful, defamatory, obscene, harmful, or infringes on the rights of others. You also agree not to engage in harassment, threats, or any abusive behavior.
      </Text>

      <Text style={styles.heading}>6. Reporting and Moderation</Text>
      <Text style={styles.section}>
        Users can report objectionable content through the app. We review reports and remove any content or users violating these Terms within 24 hours.
      </Text>

      <Text style={styles.heading}>7. Intellectual Property</Text>
      <Text style={styles.section}>
        All content, trademarks, and branding related to Stogora are owned by Stogora, Inc. or its partners. You may not copy, modify, distribute, or exploit any part of our Services without prior written consent.
      </Text>

      <Text style={styles.heading}>8. Limitation of Liability</Text>
      <Text style={styles.section}>
        To the fullest extent permitted by law, Stogora is not liable for any indirect, incidental, consequential, or punitive damages arising from your use of the Services, including but not limited to livestream content, user interactions, or third-party integrations.
      </Text>

      <Text style={styles.heading}>9. Termination</Text>
      <Text style={styles.section}>
        We may suspend or terminate your access to the Services at any time, without prior notice, if you violate these Terms or engage in behavior that harms our users, platform, or reputation.
      </Text>

      <Text style={styles.heading}>10. Governing Law</Text>
      <Text style={styles.section}>
        These Terms shall be governed and construed in accordance with the laws of the State of Delaware, without regard to conflict of law principles.
      </Text>

      <Text style={styles.heading}>11. Changes to Terms</Text>
      <Text style={styles.section}>
        Stogora reserves the right to modify these Terms at any time. We will provide notice of significant changes, and your continued use of the Services after changes are posted constitutes your acceptance.
      </Text>

      <Text style={styles.section}>
        Questions? Email us at support@stogora.shop.
      </Text>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { padding: 20 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 4 },
  updated: { fontSize: 14, color: '#888', marginBottom: 16 },
  heading: { fontSize: 18, fontWeight: '600', marginTop: 16, marginBottom: 6 },
  section: { fontSize: 16, lineHeight: 24, marginBottom: 8 },
});

export default TermsOfUseScreen;
