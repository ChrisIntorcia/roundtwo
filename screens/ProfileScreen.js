import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  FlatList,
  Modal,
} from 'react-native';
import { auth } from '../firebaseConfig';
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  onSnapshot,
} from 'firebase/firestore';
import FastImage from 'react-native-fast-image';
import EditProfileModal from './account/EditProfileModal';


export default function ProfileScreen({ navigation }) {
  const db = getFirestore();
  const user = auth.currentUser;

  const [username, setUsername] = useState('');
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [aboutMe, setAboutMe] = useState('');
  const [inventory, setInventory] = useState([]);
  const [activeTab, setActiveTab] = useState('shop');
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [showEditModal, setShowEditModal] = useState(false);

  const profileUserId = user?.uid;

  useEffect(() => {
    if (!user) return;

    const fetchUser = async () => {
      const docSnap = await getDoc(doc(db, 'users', profileUserId));
      if (docSnap.exists()) {
        const data = docSnap.data();
        setUsername(data.username || 'Unnamed User');
        setAvatarUrl(data.avatarUrl);
        setAboutMe(data.aboutMe || '');
      }
    };

    const fetchInventory = async () => {
      const productsRef = collection(db, 'users', profileUserId, 'products');
      const snapshot = await getDocs(productsRef);
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setInventory(items);
    };

    const unsubscribeFollowers = onSnapshot(
      collection(db, 'users', profileUserId, 'followers'),
      (snapshot) => {
        setFollowerCount(snapshot.size);
        const following = snapshot.docs.find(doc => doc.id === user.uid);
        setIsFollowing(!!following);
      }
    );
    const unsubscribeFollowing = onSnapshot(
      collection(db, 'users', profileUserId, 'following'),
      (snapshot) => {
        setFollowingCount(snapshot.size);
      }
    );

    fetchUser();
    fetchInventory();

    return () => {
      unsubscribeFollowers();
      unsubscribeFollowing();
    };
  }, [user]);

  const handleFollowToggle = async () => {
    const followerRef = doc(db, 'users', profileUserId, 'followers', user.uid);

    if (isFollowing) {
      await deleteDoc(followerRef);
    } else {
      await setDoc(followerRef, { followedAt: new Date() });
    }
  };

  const renderProduct = ({ item }) => (
    <View style={styles.productItem}>
      <FastImage source={{ uri: item.images[0], priority: FastImage.priority.normal }} style={styles.productImage} resizeMode={FastImage.resizeMode.cover} />
      <Text style={styles.productTitle}>{item.title}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Text style={{ color: 'white', fontSize: 18 }}>{'<'} </Text>
        </TouchableOpacity>
        {avatarUrl ? (
          <FastImage source={{ uri: avatarUrl }} style={styles.avatar} resizeMode={FastImage.resizeMode.cover} />
        ) : (
          <Image source={require('../assets/nothing.png')} style={styles.avatar} resizeMode="cover" />
        )}
        <Text style={styles.username}>{username}</Text>
        {aboutMe ? <Text style={styles.aboutMe}>{aboutMe}</Text> : null}
        <Text style={styles.followerText}>
          {followerCount} Followers • {followingCount} Following
        </Text>
        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.messageButton}><Text style={styles.buttonText}>Messages</Text></TouchableOpacity>
          {profileUserId !== user.uid ? (
            <TouchableOpacity
              style={styles.editButton}
              onPress={handleFollowToggle}
            >
              <Text style={styles.buttonTextBlack}>{isFollowing ? 'Unfollow' : 'Follow'}</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={styles.editButton} onPress={() => setShowEditModal(true)}>
              <Text style={styles.buttonTextBlack}>Edit Profile</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.tabRow}>
        <TouchableOpacity onPress={() => setActiveTab('shop')}><Text style={[styles.tab, activeTab === 'shop' && styles.activeTab]}>Shop</Text></TouchableOpacity>
        <TouchableOpacity onPress={() => setActiveTab('reviews')}><Text style={[styles.tab, activeTab === 'reviews' && styles.activeTab]}>Reviews</Text></TouchableOpacity>
      </View>

      <View style={styles.content}>
        {activeTab === 'shop' ? (
          inventory.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={{ color: '#333' }}>Nothing for sale here</Text>
            </View>
          ) : (
            <FlatList
              data={inventory}
              numColumns={2}
              renderItem={renderProduct}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.grid}
            />
          )
        ) : (
          <View style={styles.emptyState}><Text style={{ color: '#999' }}>No reviews yet</Text></View>
        )}
      </View>

      <EditProfileModal
        visible={showEditModal}
        onClose={() => setShowEditModal(false)}
        currentAbout={aboutMe}
        currentAvatar={avatarUrl}
        onSaved={({ avatarUrl, aboutMe }) => {
          setAvatarUrl(avatarUrl);
          setAboutMe(aboutMe);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { alignItems: 'center', backgroundColor: '#000', paddingTop: 60, paddingBottom: 20 },
  backButton: { position: 'absolute', top: 60, left: 20 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#888', marginBottom: 8 },
  username: { fontWeight: 'bold', fontSize: 18, color: '#fff' },
  aboutMe: { color: '#ccc', fontStyle: 'italic', marginTop: 4, marginHorizontal: 20, textAlign: 'center' },
  followerText: { color: '#aaa', marginTop: 4 },
  buttonRow: { flexDirection: 'row', marginTop: 12 },
  messageButton: { backgroundColor: 'black', borderRadius: 20, paddingHorizontal: 20, paddingVertical: 8, marginRight: 8, borderWidth: 1, borderColor: 'white' },
  editButton: { backgroundColor: 'white', borderRadius: 20, paddingHorizontal: 20, paddingVertical: 8 },
  buttonText: { color: 'white', fontWeight: 'bold' },
  buttonTextBlack: { color: 'black', fontWeight: 'bold' },
  tabRow: { flexDirection: 'row', justifyContent: 'center', borderBottomWidth: 1, borderColor: '#ddd' },
  tab: { paddingVertical: 10, paddingHorizontal: 20, color: '#888' },
  activeTab: { color: '#000', fontWeight: 'bold', borderBottomWidth: 2, borderColor: '#000' },
  content: { flex: 1 },
  emptyState: { justifyContent: 'flex-start', alignItems: 'center', paddingTop: 60 },
  grid: { padding: 10 },
  productItem: { flex: 1, margin: 5, alignItems: 'center' },
  productImage: { width: 120, height: 120, borderRadius: 10 },
  productTitle: { marginTop: 6, fontSize: 14 },
});
