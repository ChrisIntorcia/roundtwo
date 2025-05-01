import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  SafeAreaView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import { auth } from '../../firebaseConfig';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

const db = getFirestore();

const DEFAULT_PREFERENCES = {
  livestreams: true,
  orders: true,
  follows: true,
  messages: true,
};

export default function Notifications() {
  const [prefs, setPrefs] = useState(DEFAULT_PREFERENCES);
  const [loading, setLoading] = useState(true);
  const navigation = useNavigation();
  const user = auth.currentUser;

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchPrefs = async () => {
      try {
        const ref = doc(db, 'users', user.uid, 'notificationPrefs', 'settings');
        const snap = await getDoc(ref);
        
        if (snap.exists()) {
          setPrefs(snap.data());
        } else {
          // If preferences don't exist, create them with default values
          await setDoc(ref, DEFAULT_PREFERENCES);
        }
      } catch (error) {
        console.error('Error fetching notification preferences:', error);
        Alert.alert(
          'Error',
          'Unable to load notification preferences. Please try again later.'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchPrefs();
  }, []);

  const togglePref = async (key) => {
    if (!user) return;

    try {
      const newPrefs = { ...prefs, [key]: !prefs[key] };
      const ref = doc(db, 'users', user.uid, 'notificationPrefs', 'settings');
      
      // Update local state immediately for better UX
      setPrefs(newPrefs);
      
      // Then update Firestore
      await setDoc(ref, newPrefs);
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      // Revert the toggle if the update fails
      setPrefs(prefs);
      Alert.alert(
        'Error',
        'Failed to update notification settings. Please try again.'
      );
    }
  };

  const getIcon = (key) => {
    switch (key) {
      case 'livestreams':
        return 'videocam-outline';
      case 'orders':
        return 'cart-outline';
      case 'follows':
        return 'people-outline';
      case 'messages':
        return 'chatbubble-outline';
      default:
        return 'notifications-outline';
    }
  };

  const getLabel = (key) => {
    switch (key) {
      case 'livestreams':
        return 'Livestream Alerts';
      case 'orders':
        return 'Order Updates';
      case 'follows':
        return 'New Followers';
      case 'messages':
        return 'Message Notifications';
      default:
        return key;
    }
  };

  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="chevron-back" size={24} color="#222" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Notifications</Text>
          <View style={styles.placeholder} />
        </View>
        <View style={styles.content}>
          <Text style={styles.errorText}>Please log in to manage notifications</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#E76A54" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={24} color="#222" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.content}>
        <Text style={styles.sectionTitle}>Notification Preferences</Text>
        
        {Object.entries(prefs).map(([key, value]) => (
          <View key={key} style={styles.preferenceCard}>
            <View style={styles.preferenceInfo}>
              <View style={[styles.iconContainer, { backgroundColor: value ? '#E76A54' : '#f0f0f0' }]}>
                <Ionicons 
                  name={getIcon(key)} 
                  size={16} 
                  color={value ? '#fff' : '#666'} 
                />
              </View>
              <Text style={styles.label}>{getLabel(key)}</Text>
            </View>
            <Switch
              value={value}
              onValueChange={() => togglePref(key)}
              trackColor={{ false: '#e0e0e0', true: '#fad4cd' }}
              thumbColor={value ? '#E76A54' : '#fff'}
              ios_backgroundColor="#e0e0e0"
            />
          </View>
        ))}

        <Text style={styles.footerNote}>
          We'll only send you notifications based on your preferences
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#222',
  },
  placeholder: {
    width: 32,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 16,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  preferenceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  preferenceInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  label: {
    fontSize: 15,
    color: '#222',
  },
  footerNote: {
    marginTop: 16,
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
  },
  errorText: {
    textAlign: 'center',
    color: '#666',
    fontSize: 15,
  },
});
