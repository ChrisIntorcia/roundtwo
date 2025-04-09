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
    const checkUsername = async () => {
      const user = auth.currentUser;
      if (user) {
        const userRef = doc(db, 'users', user.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const userData = userSnap.data();
          if (!userData.username) {
            setShowPopup(true);
          }
        }
      }
    };

    checkUsername();
  }, []);

  const handleSetUsername = async () => {
    const user = auth.currentUser;
    if (user && username.trim()) {
      const userRef = doc(db, 'users', user.uid);
      await setDoc(userRef, { username }, { merge: true });
      setShowPopup(false);
    }
  };

  const renderStream = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('ViewerScreen', { channel: item.channel })}
    >
      <Image source={{ uri: item.thumbnailUrl }} style={styles.thumbnail} />
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
        numColumns={2}
        contentContainerStyle={styles.grid}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={<Text style={styles.emptyText}>No live streams right now.</Text>}
      />

      {/* Username Setup Modal */}
      <Modal visible={showPopup} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Choose a Username</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter username"
              value={username}
              onChangeText={setUsername}
            />
            <Button title="Save" onPress={handleSetUsername} />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF', // white background
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    paddingHorizontal: 16,
    marginBottom: 10,
    color: '#222',
  },
  grid: {
    paddingHorizontal: 10,
    paddingBottom: 40,
  },
  card: {
    flex: 1,
    margin: 8,
    borderRadius: 12,
    backgroundColor: '#F9F9F9',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  thumbnail: {
    width: '100%',
    height: 150,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  liveBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: '#FF3B30',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  liveText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
  },
  infoSection: {
    padding: 10,
  },
  streamer: {
    fontSize: 12,
    fontWeight: '400',
    color: '#666',
    fontFamily: 'System',
  },  
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
    fontFamily: 'System',
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    marginTop: 100,
    fontSize: 16,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
  },
  modalContent: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    width: '80%',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    width: '100%',
    marginBottom: 12,
    borderRadius: 6,
  },
});
