import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  RefreshControl,
  ActivityIndicator,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import { collection, onSnapshot, query, where, doc, getDoc, setDoc } from 'firebase/firestore';
import { db, auth } from '../firebaseConfig';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import FastImage from 'react-native-fast-image';

const { width } = Dimensions.get('window');
const CARD_MARGIN = 12;
const CARD_WIDTH = (width - CARD_MARGIN * 4) / 2;

export default function HomeScreen() {
  const [streams, setStreams] = useState([]);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [missingUsername, setMissingUsername] = useState(false);
  const [missingEmail, setMissingEmail] = useState(false);
  const [showPopup, setShowPopup] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const navigation = useNavigation();

  const fetchStreams = () => {
    const q = query(collection(db, 'livestreams'), where('isLive', '==', true));
    return onSnapshot(q, (snapshot) => {
      const liveStreams = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setStreams(liveStreams);
      setIsLoading(false);
      setIsRefreshing(false);
    });
  };

  useEffect(() => {
    const unsubscribe = fetchStreams();
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
              setEmail(user.email || '');
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

  const onRefresh = () => {
    setIsRefreshing(true);
    fetchStreams();
  };

  const renderStream = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('ViewerScreen', { channel: item.channel })}
      activeOpacity={0.9}
    >
      <FastImage 
        source={{ uri: item.thumbnailUrl }} 
        style={styles.thumbnail}
        resizeMode={FastImage.resizeMode.cover}
      />
      <View style={styles.liveBadge}>
        <View style={styles.liveIndicator} />
        <Text style={styles.viewerCount}>{item.viewers}</Text>
      </View>
      <View style={styles.infoSection}>
        <Text style={styles.title} numberOfLines={2}>
          {item.title || 'Untitled Stream'}
        </Text>
        <View style={styles.streamerRow}>
          {item.streamerAvatar ? (
            <FastImage
              source={{ uri: item.streamerAvatar }}
              style={styles.streamerAvatar}
            />
          ) : (
            <View style={[styles.streamerAvatar, styles.placeholderAvatar]}>
              <Ionicons name="person" size={12} color="#999" />
            </View>
          )}
          <Text style={styles.streamer}>{item.streamer}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>Live Now</Text>
      <View style={styles.headerRight}>
        <TouchableOpacity style={styles.iconButton}>
          <Ionicons name="notifications-outline" size={24} color="#222" />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons name="videocam-outline" size={50} color="#ccc" />
      <Text style={styles.emptyText}>No live streams right now</Text>
      <Text style={styles.emptySubtext}>Check back later for new streams</Text>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#E76A54" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={streams}
        renderItem={renderStream}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.grid}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmpty}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={onRefresh}
            tintColor="#E76A54"
          />
        }
      />

      <Modal visible={showPopup} transparent animationType="fade">
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => {}}
        >
          <View style={styles.modalView}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>
                {missingEmail ? "Complete Your Profile" : "Choose a Username"}
              </Text>
              <Text style={styles.modalSubtitle}>
                {missingEmail 
                  ? "Please provide your username and email to continue"
                  : "Pick a unique username for your account"
                }
              </Text>

              {missingUsername && (
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Username</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter username"
                    value={username}
                    onChangeText={(text) => {
                      const filtered = text.replace(/[^a-zA-Z0-9_.]/g, '');
                      setUsername(filtered);
                    }}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
              )}

              {missingEmail && (
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Email</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Enter email"
                    value={email}
                    onChangeText={setEmail}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
              )}

              <TouchableOpacity 
                style={styles.saveButton} 
                onPress={handleSetUserInfo}
              >
                <Text style={styles.saveButtonText}>Continue</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
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
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#222',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconButton: {
    padding: 8,
  },
  grid: {
    padding: CARD_MARGIN,
  },
  card: {
    width: CARD_WIDTH,
    margin: CARD_MARGIN,
    borderRadius: 12,
    backgroundColor: '#fff',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  thumbnail: {
    width: '100%',
    height: CARD_WIDTH * 0.75,
    backgroundColor: '#f0f0f0',
  },
  liveBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  liveIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FF3B30',
    marginRight: 4,
  },
  viewerCount: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  infoSection: {
    padding: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
    color: '#222',
    marginBottom: 8,
    lineHeight: 18,
  },
  streamerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  streamerAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 6,
  },
  placeholderAvatar: {
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  streamer: {
    fontSize: 12,
    color: '#666',
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalView: {
    width: '85%',
    backgroundColor: '#fff',
    borderRadius: 20,
    overflow: 'hidden',
  },
  modalContent: {
    padding: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#222',
    textAlign: 'center',
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  inputContainer: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#222',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 12,
    fontSize: 16,
    color: '#222',
  },
  saveButton: {
    backgroundColor: '#E76A54',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
