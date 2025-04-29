import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import CustomHeader from '../../components/CustomHeader';

const AccountInfoScreen = () => {
  const navigation = useNavigation();

  return (
    <View style={styles.container}>
      <CustomHeader title="Account Info" showBack />
      
      <View style={styles.content}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About Your Account</Text>
          <Text style={styles.explanation}>
            Your account contains all your personal information, purchase history, and seller data if you're a seller. 
            Deleting your account will permanently remove all of this information and cannot be undone.
          </Text>
        </View>

        <TouchableOpacity
          style={styles.option}
          onPress={() => navigation.navigate("DeleteAccount")}
        >
          <Text style={styles.deleteText}>Delete Account</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
    marginBottom: 12,
  },
  explanation: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
  },
  option: {
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderTopWidth: 1,
    borderColor: "#ddd",
  },
  deleteText: {
    color: '#E76A54',
    fontSize: 16,
  },
});

export default AccountInfoScreen; 