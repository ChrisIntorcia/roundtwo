import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  FlatList,
  Modal,
  Dimensions,
  ScrollView,
  RefreshControl,
  Alert,
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import { useNavigation } from '@react-navigation/native';
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
  query, 
  where,
  updateDoc,
} from 'firebase/firestore';
import FastImage from 'react-native-fast-image';
import EditProfileModal from './account/EditProfileModal';
import CustomHeader from '../components/CustomHeader';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const PRODUCT_WIDTH = (width - 48) / 2;

export default function ProfileScreen() {
  const db = getFirestore();
  const user = auth.currentUser;
  const navigation = useNavigation();
  const [refreshing, setRefreshing] = useState(false);

  const [username, setUsername] = useState('');
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [aboutMe, setAboutMe] = useState('');
  const [inventory, setInventory] = useState([]);
  const [activeTab, setActiveTab] = useState('shop');
  const [isFollowing, setIsFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [isUserBlocked, setIsUserBlocked] = useState(false);

  const route = useRoute();
  const [profileUserId, setProfileUserId] = useState(user?.uid);

useEffect(() => {
  if (route.params?.userId && route.params.userId !== profileUserId) {
    setProfileUserId(route.params.userId);
  }
}, [route.params?.userId]);


  const fetchData = async () => {
    if (!profileUserId) return;
    
    try {
      const docSnap = await getDoc(doc(db, 'users', profileUserId));
      if (docSnap.exists()) {
        const data = docSnap.data();
        setUsername(data.username || 'Unnamed User');
        setAvatarUrl(data.avatarUrl);
        setAboutMe(data.aboutMe || '');
      }

      const productsRef = query(collection(db, 'products'), where('sellerId', '==', profileUserId))
      const snapshot = await getDocs(productsRef);      
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setInventory(items);
    } catch (error) {
      console.error('Error fetching profile data:', error);
    }
  };

  useEffect(() => {
    if (!profileUserId) return;

    fetchData();

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

    return () => {
      unsubscribeFollowers();
      unsubscribeFollowing();
    };
  }, [profileUserId]);

  useEffect(() => {
    if (!profileUserId || !user?.uid || profileUserId === user?.uid) return;

    const checkBlockStatus = async () => {
      try {
        const currentUserDoc = await getDoc(doc(db, 'users', user.uid));
        const blockedUsers = currentUserDoc.data()?.blockedUsers || [];
        setIsUserBlocked(blockedUsers.includes(profileUserId));
      } catch (err) {
        console.error('Error checking block status:', err);
      }
    };

    checkBlockStatus();
  }, [profileUserId, user?.uid]);

  const onRefresh = React.useCallback(async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }, []);

  const handleFollowToggle = async () => {
    const followerRef = doc(db, 'users', profileUserId, 'followers', user.uid);
    const followingRef = doc(db, 'users', user.uid, 'following', profileUserId);
  
    try {
      if (isFollowing) {
        await deleteDoc(followerRef);
        await deleteDoc(followingRef);
      } else {
        await setDoc(followerRef, {
          followedAt: new Date(),
          username: user.displayName || '',
        });
        await setDoc(followingRef, {
          followedAt: new Date(),
          username: username || '',
        });
      }
      setIsFollowing(!isFollowing);
    } catch (err) {
      console.error("⚠️ Error toggling follow state:", err);
    }
  };  

  const handleBlockUser = async () => {
    if (!profileUserId || !user?.uid) return;

    try {
      const userRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userRef);
      const currentBlockedUsers = userDoc.data()?.blockedUsers || [];
      
      if (isUserBlocked) {
        // Unblock user
        await updateDoc(userRef, {
          blockedUsers: currentBlockedUsers.filter(id => id !== profileUserId)
        });
        setIsUserBlocked(false);
        Alert.alert('Success', `Unblocked ${username}`);
      } else {
        // Block user
        await updateDoc(userRef, {
          blockedUsers: [...currentBlockedUsers, profileUserId]
        });
        setIsUserBlocked(true);
        Alert.alert('Success', `Blocked ${username}`);
      }
    } catch (err) {
      console.error('Error toggling block status:', err);
      Alert.alert('Error', 'Failed to update block status');
    }
    setShowMoreOptions(false);
  };

  const handleReportUser = () => {
    Alert.alert(
      'Report User',
      'What would you like to report this user for?',
      [
        {
          text: 'Inappropriate Content',
          onPress: () => submitReport('inappropriate_content')
        },
        {
          text: 'Harassment',
          onPress: () => submitReport('harassment')
        },
        {
          text: 'Spam',
          onPress: () => submitReport('spam')
        },
        {
          text: 'Scam',
          onPress: () => submitReport('scam')
        },
        {
          text: 'Cancel',
          style: 'cancel'
        }
      ]
    );
  };

  const submitReport = async (reason) => {
    if (!profileUserId || !user?.uid) return;

    try {
      const reportRef = doc(collection(db, 'reports'));
      await setDoc(reportRef, {
        reportedUserId: profileUserId,
        reportedBy: user.uid,
        reason: reason,
        timestamp: new Date(),
        status: 'pending',
        reportedUsername: username
      });
      Alert.alert(
        'Report Submitted',
        'Thank you for your report. We will review it shortly.'
      );
    } catch (err) {
      console.error('Error submitting report:', err);
      Alert.alert('Error', 'Failed to submit report');
    }
    setShowMoreOptions(false);
  };

  const renderProduct = ({ item }) => (
    <TouchableOpacity 
      style={styles.productItem}
      onPress={() => navigation.navigate("ProductDetailsScreen", { product: item })}
      activeOpacity={0.8}
    >
      <FastImage 
        source={{ uri: item.images[0], priority: FastImage.priority.normal }} 
        style={styles.productImage} 
        resizeMode={FastImage.resizeMode.cover}
      />
      <View style={styles.productInfo}>
        <Text style={styles.productTitle} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.productPrice}>${item.fullPrice}</Text>
      </View>
    </TouchableOpacity>
  );

  const StatBox = ({ label, value }) => (
    <View style={styles.statBox}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <CustomHeader 
        title={username} 
        showBack={true}
        onBack={() => navigation.goBack()}
        rightComponent={
          profileUserId !== user?.uid && (
            <TouchableOpacity
              onPress={() => setShowMoreOptions(true)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="ellipsis-vertical" size={24} color="#666" />
            </TouchableOpacity>
          )
        }
      />
      
      <ScrollView 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.header}>
          <View style={styles.avatarContainer}>
            {avatarUrl ? (
              <FastImage 
                source={{ uri: avatarUrl }} 
                style={styles.avatar} 
                resizeMode={FastImage.resizeMode.cover}
              />
            ) : (
              <View style={[styles.avatar, styles.placeholderAvatar]}>
                <Ionicons name="person" size={40} color="#999" />
              </View>
            )}
          </View>

          <View style={styles.statsRow}>
            <StatBox label="Products" value={inventory.length} />
            <StatBox label="Followers" value={followerCount} />
            <StatBox label="Following" value={followingCount} />
          </View>

          {aboutMe ? (
            <Text style={styles.aboutMe}>{aboutMe}</Text>
          ) : null}

<View style={styles.buttonRow}>
  <TouchableOpacity
    style={[styles.button, styles.messageButton]}
    onPress={() => {
      if (profileUserId === user.uid) {
        navigation.navigate('InboxScreen');
      } else {
        navigation.navigate('MessagesScreen', {
          otherUserId: profileUserId,
          otherUsername: username,
        });
      }
    }}
  >
    <Ionicons 
      name={profileUserId === user.uid ? "mail" : "chatbubble"} 
      size={20} 
      color="#fff" 
    />
    <Text style={styles.buttonText}>
      {profileUserId === user.uid ? 'Inbox' : 'Message'}
    </Text>
  </TouchableOpacity>

  {profileUserId !== user.uid ? (
    <>
      <TouchableOpacity
        style={[styles.button, styles.followButton, isFollowing && styles.unfollowButton]}
        onPress={handleFollowToggle}
      >
        <Ionicons 
          name={isFollowing ? "person-remove" : "person-add"} 
          size={20} 
          color={isFollowing ? "#666" : "#fff"} 
        />
        <Text style={[styles.buttonText, isFollowing && styles.unfollowText]}>
          {isFollowing ? 'Unfollow' : 'Follow'}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        onPress={() => setShowMoreOptions(true)}
        style={[styles.button, styles.moreButton]}
      >
        <Ionicons name="ellipsis-vertical" size={20} color="#666" />
      </TouchableOpacity>
    </>
  ) : (
    <TouchableOpacity 
      style={[styles.button, styles.editButton]} 
      onPress={() => setShowEditModal(true)}
    >
      <Ionicons name="pencil" size={20} color="#666" />
      <Text style={styles.editButtonText}>Edit Profile</Text>
    </TouchableOpacity>
  )}
</View>
        </View>

        <View style={styles.tabRow}>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'shop' && styles.activeTab]}
            onPress={() => setActiveTab('shop')}
          >
            <Ionicons 
              name="grid" 
              size={24} 
              color={activeTab === 'shop' ? '#E76A54' : '#666'} 
            />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.tab, activeTab === 'reviews' && styles.activeTab]}
            onPress={() => setActiveTab('reviews')}
          >
            <Ionicons 
              name="star" 
              size={24} 
              color={activeTab === 'reviews' ? '#E76A54' : '#666'} 
            />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          {activeTab === 'shop' ? (
            inventory.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="bag-outline" size={50} color="#999" />
                <Text style={styles.emptyStateText}>No products listed yet</Text>
              </View>
            ) : (
              <FlatList
                data={inventory}
                numColumns={2}
                renderItem={renderProduct}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
                contentContainerStyle={styles.grid}
              />
            )
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="star-outline" size={50} color="#999" />
              <Text style={styles.emptyStateText}>No reviews yet</Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* More Options Modal */}
      <Modal
        visible={showMoreOptions}
        transparent
        animationType="fade"
        onRequestClose={() => setShowMoreOptions(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowMoreOptions(false)}
        >
          <View style={styles.moreOptionsContainer}>
            <TouchableOpacity
              style={styles.optionButton}
              onPress={handleBlockUser}
            >
              <Ionicons
                name={isUserBlocked ? "person-add" : "person-remove"}
                size={24}
                color={isUserBlocked ? "#E76A54" : "#666"}
              />
              <Text style={[styles.optionText, isUserBlocked && { color: '#E76A54' }]}>
                {isUserBlocked ? 'Unblock User' : 'Block User'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.optionButton}
              onPress={handleReportUser}
            >
              <Ionicons name="flag" size={24} color="#666" />
              <Text style={styles.optionText}>Report User</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <EditProfileModal
        visible={showEditModal}
        onClose={() => setShowEditModal(false)}
        currentAbout={aboutMe}
        currentAvatar={avatarUrl}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 16,
  },
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  placeholderAvatar: {
    backgroundColor: '#f0f0f0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  statBox: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2d3436',
  },
  statLabel: {
    fontSize: 12,
    color: '#95a5a6',
    marginTop: 4,
  },
  aboutMe: {
    fontSize: 14,
    color: '#2d3436',
    textAlign: 'center',
    marginBottom: 16,
    paddingHorizontal: 32,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    gap: 8,
  },
  messageButton: {
    backgroundColor: '#E76A54',
  },
  followButton: {
    backgroundColor: '#E76A54',
  },
  unfollowButton: {
    backgroundColor: '#f0f0f0',
  },
  editButton: {
    backgroundColor: '#f0f0f0',
  },
  buttonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  unfollowText: {
    color: '#666',
  },
  editButtonText: {
    color: '#666',
    fontSize: 14,
    fontWeight: '600',
  },
  tabRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#eee',
    marginTop: 16,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#E76A54',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  grid: {
    gap: 16,
  },
  productItem: {
    width: PRODUCT_WIDTH,
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  productImage: {
    width: '100%',
    height: PRODUCT_WIDTH,
    backgroundColor: '#f0f0f0',
  },
  productInfo: {
    padding: 8,
  },
  productTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2d3436',
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#E76A54',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#999',
    marginTop: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  moreOptionsContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 16,
    paddingBottom: 32,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  optionText: {
    fontSize: 16,
    color: '#2d3436',
  },
});
