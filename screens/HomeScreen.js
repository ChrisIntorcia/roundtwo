import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  Image,
  TouchableOpacity,
  Modal,
  TextInput,
  Button,
} from 'react-native';
import { collection, onSnapshot, query, where, doc, getDoc, setDoc } from 'firebase/firestore';
import { db, auth } from '../firebaseConfig';
import { useNavigation } from '@react-navigation/native';
import CustomHeader from "../components/CustomHeader";

export default function HomeScreen() {
  const [streams, setStreams] = useState([]);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [missingUsername, setMissingUsername] = useState(false);
  const [missingEmail, setMissingEmail] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const navigation = useNavigation();

  useEffect(() => {
    const q = query(collection(db, 'livestreams'), where('isLive', '==', true));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const liveStreams = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setStreams(liveStreams);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const checkUserInfo = async () => {
      const user = auth.currentUser;
      if (user) {
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const userData = userSnap.data();
          if (!userData.username || !userData.email) {
            if (!userData.username) setMissingUsername(true);
            if (!userData.email) {
              setMissingEmail(true);
              setEmail(user.email || ''); // Prefill if available
            }
            setShowPopup(true);
          }
        }
      }
    };

    checkUserInfo();
  }, []);

  const handleSetUserInfo = async () => {
    const user = auth.currentUser;
    if (!user) return;

    const updates = {};
    if (missingUsername && username.trim()) updates.username = username.trim();
    if (missingEmail && email.trim()) updates.email = email.trim();

    if (Object.keys(updates).length > 0) {
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, updates, { merge: true });
    }

    setShowPopup(false);
  };

  const renderStream = ({ item }) => (
    <TouchableOpacity
      style={[styles.card, streams.length === 1 && styles.singleCard]}
      onPress={() => navigation.navigate('ViewerScreen', { channel: item.channel })}
    >
      <Image source={{ uri: item.thumbnailUrl }} style={streams.length === 1 ? styles.singleThumbnail : styles.thumbnail} />
      <View style={styles.liveBadge}>
        <Text style={styles.liveText}>🔴 {item.viewers} watching</Text>
      </View>
      <View style={styles.infoSection}>
        <Text style={styles.title}>{item.title || 'Untitled Stream'}</Text>
        <Text style={styles.streamer}>{item.streamer}</Text>
      </View>
    </TouchableOpacity>
  );  

  return (
    <View style={styles.container}>
      <CustomHeader title="🔥 Live Now" />
      <FlatList
  data={streams}
  renderItem={renderStream}
  keyExtractor={(item) => item.id}
  numColumns={streams.length === 1 ? 1 : 2}
  key={streams.length === 1 ? 'single-column' : 'two-columns'}  // << ✅ force re-render if columns change
  contentContainerStyle={styles.grid}
  showsVerticalScrollIndicator={false}
  ListEmptyComponent={<Text style={styles.emptyText}>No live streams right now.</Text>}
/>



      {/* Username & Email Setup Modal */}
      <Modal visible={showPopup} transparent animationType="fade">
  <TouchableOpacity
    style={styles.modalBackdrop}
    activeOpacity={1}
    onPressOut={() => {}}
  >
    <View style={styles.centeredView}>
      <View style={styles.modalContent}>
      <Text style={styles.modalTitle}>
  {missingEmail ? "Add your username and email" : "Choose a username"}
</Text>


        {missingUsername && (
          <TextInput
           style={styles.input}
           placeholder="Username"
           value={username}
           onChangeText={(text) => {
             const filtered = text.replace(/[^a-zA-Z0-9_.]/g, '');
              setUsername(filtered);
              }}
/>
        )}
        {missingEmail && (
          <TextInput
            style={styles.input}
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
        )}

        <TouchableOpacity style={styles.saveButton} onPress={handleSetUserInfo}>
          <Text style={styles.saveButtonText}>Save</Text>
        </TouchableOpacity>
      </View>
    </View>
  </TouchableOpacity>
</Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  grid: { paddingHorizontal: 10, paddingBottom: 40 },
  card: { flex: 1, margin: 8, borderRadius: 12, backgroundColor: '#F9F9F9', overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 6, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  thumbnail: { width: '100%', height: 150, borderTopLeftRadius: 12, borderTopRightRadius: 12 },
  liveBadge: { position: 'absolute', top: 10, left: 10, backgroundColor: '#FF3B30', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  liveText: { color: 'white', fontWeight: 'bold', fontSize: 12 },
  infoSection: { padding: 10 },
  streamer: { fontSize: 12, fontWeight: '400', color: '#666', fontFamily: 'System' },
  title: { fontSize: 16, fontWeight: '600', color: '#111', fontFamily: 'System' },
  emptyText: { textAlign: 'center', color: '#999', marginTop: 100, fontSize: 16 },
  modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.6)' },
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  centeredView: { width: '80%', backgroundColor: '#fff', borderRadius: 16, paddingVertical: 24, paddingHorizontal: 20, alignItems: 'center' },
  modalContent: { width: '100%', alignItems: 'center' },
  modalTitle: { fontSize: 20, fontWeight: '600', marginBottom: 16, textAlign: 'center' },
  input: { width: '100%', borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12, marginBottom: 16 },
  saveButton: { backgroundColor: '#E76A54', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 32, marginTop: 8 },
  saveButtonText: { color: 'white', fontWeight: '600', fontSize: 16 },
  singleCard: { marginHorizontal: 20 },
  singleThumbnail: { width: '100%', height: 250, borderTopLeftRadius: 12, borderTopRightRadius: 12 },
});
