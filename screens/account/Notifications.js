import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Switch } from 'react-native';
import { getFirestore, doc, getDoc, setDoc } from 'firebase/firestore';
import { auth } from '../../firebaseConfig';

const db = getFirestore();

export default function Notifications() {
  const [prefs, setPrefs] = useState({
    livestreams: true,
    orders: true,
    follows: true,
  });

  const user = auth.currentUser;

  useEffect(() => {
    if (!user) return;
    const fetchPrefs = async () => {
      const ref = doc(db, 'users', user.uid, 'notificationPrefs', 'settings');
      const snap = await getDoc(ref);
      if (snap.exists()) {
        setPrefs(snap.data());
      }
    };
    fetchPrefs();
  }, []);

  const togglePref = async (key) => {
    const newPrefs = { ...prefs, [key]: !prefs[key] };
    setPrefs(newPrefs);
    const ref = doc(db, 'users', user.uid, 'notificationPrefs', 'settings');
    await setDoc(ref, newPrefs);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Notification Preferences</Text>

      {Object.entries(prefs).map(([key, value]) => (
        <View key={key} style={styles.row}>
          <Text style={styles.label}>
            {key === 'livestreams' && 'Livestream Alerts'}
            {key === 'orders' && 'Order Updates'}
            {key === 'follows' && 'New Followers'}
          </Text>
          <Switch value={value} onValueChange={() => togglePref(key)} />
        </View>
      ))}

      <Text style={styles.footerNote}>
        We’ll only send you notifications based on your preferences.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, backgroundColor: '#fff', flex: 1 },
  header: { fontSize: 20, fontWeight: '600', color: '#222', marginBottom: 20 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  label: { fontSize: 16, color: '#333' },
  footerNote: {
    marginTop: 32,
    fontSize: 13,
    color: '#777',
    textAlign: 'center',
  },
});
