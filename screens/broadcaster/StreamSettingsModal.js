import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  Alert,
  FlatList,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { doc, updateDoc, collection, getDocs, getDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import styles, { ACCENT_COLOR } from './broadcasterStyles';

const StreamSettingsModal = ({
  visible,
  setVisible,
  muted,
  toggleMute,
  viewerCount,
  messages,
  rtcEngineRef,
  navigation,
  channelName,
  db,
  viewers,
}) => {
  console.log('StreamSettingsModal rendered with visible:', visible);

  const [showBlockView, setShowBlockView] = useState(false);
  const [blockedUsers, setBlockedUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredViewers, setFilteredViewers] = useState([]);
  const loadingRef = useRef(false);

  useEffect(() => {
    console.log('Modal State:', {
      visible,
      showBlockView,
      isLoading,
      viewersCount: filteredViewers.length,
      blockedUsersCount: blockedUsers.length
    });
  }, [visible, showBlockView, isLoading, filteredViewers, blockedUsers]);

  const fetchBlockedUsers = async () => {
    console.log('📥 Fetching blocked users...');
    try {
      const userDoc = await getDoc(doc(db, 'users', getAuth().currentUser.uid));
      const currentBlockedUsers = userDoc.data()?.blockedUsers || [];
      console.log('✅ Blocked users fetched:', currentBlockedUsers);
      setBlockedUsers(currentBlockedUsers);
      return currentBlockedUsers;
    } catch (err) {
      console.error('❌ Failed to fetch blocked users:', err);
      Alert.alert('Error', 'Failed to load blocked users');
      return [];
    }
  };

  const fetchViewers = async () => {
    console.log('📥 Fetching viewers...');
    try {
      const snapshot = await getDocs(collection(db, 'livestreams', channelName, 'viewers'));
      const viewerList = snapshot.docs.map(doc => ({
        ...doc.data(),
        uid: doc.id
      }));
      console.log('✅ Viewers fetched:', viewerList.length);
      setFilteredViewers(viewerList);
      return viewerList;
    } catch (err) {
      console.error('❌ Failed to fetch viewers:', err);
      Alert.alert('Error', 'Failed to load viewers.');
      return [];
    }
  };

  const handleOpenBlockView = async () => {
    console.log('🔍 Opening block view...');
    if (loadingRef.current) {
      console.log('⚠️ Already loading');
      return;
    }

    setIsLoading(true);
    loadingRef.current = true;

    try {
      await Promise.all([fetchViewers(), fetchBlockedUsers()]);
      console.log('✅ Setting showBlockView to true');
      setShowBlockView(true);
    } catch (err) {
      console.error('❌ Error:', err);
      Alert.alert('Error', 'Failed to load viewer data');
    } finally {
      setIsLoading(false);
      loadingRef.current = false;
    }
  };

  const handleSearch = (text) => {
    setSearchQuery(text);
    if (!text.trim()) {
      setFilteredViewers(viewers || []);
    } else {
      const filtered = (viewers || []).filter(viewer => 
        viewer.username?.toLowerCase().includes(text.toLowerCase()) ||
        viewer.uid?.toLowerCase().includes(text.toLowerCase())
      );
      setFilteredViewers(filtered);
    }
  };

  const toggleBlockUser = async (userId, username) => {
    if (loadingRef.current) return;
    loadingRef.current = true;

    try {
      const userDocRef = doc(db, 'users', getAuth().currentUser.uid);
      const userDoc = await getDoc(userDocRef);
      const currentBlockedUsers = userDoc.data()?.blockedUsers || [];
      
      const newBlockedUsers = currentBlockedUsers.includes(userId)
        ? currentBlockedUsers.filter(id => id !== userId)
        : [...currentBlockedUsers, userId];
      
      await updateDoc(userDocRef, { blockedUsers: newBlockedUsers });
      setBlockedUsers(newBlockedUsers);
      Alert.alert('Success', currentBlockedUsers.includes(userId) 
        ? `Unblocked ${username}`
        : `Blocked ${username}`
      );
    } catch (err) {
      console.error('Failed to toggle block user:', err);
      Alert.alert('Error', 'Failed to update blocked status');
    } finally {
      loadingRef.current = false;
    }
  };

  const renderContent = () => {
    if (showBlockView) {
      return (
        <View style={styles.modalContent}>
          <View style={styles.optionsHeader}>
            <TouchableOpacity onPress={() => setShowBlockView(false)}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.optionsTitle}>Manage Viewers</Text>
            <View style={{ width: 24 }} />
          </View>

          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search viewers..."
              placeholderTextColor="#999"
              value={searchQuery}
              onChangeText={handleSearch}
            />
          </View>

          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={ACCENT_COLOR} />
              <Text style={styles.loadingText}>Loading viewers...</Text>
            </View>
          ) : filteredViewers.length === 0 ? (
            <Text style={styles.emptyText}>No viewers found</Text>
          ) : (
            <FlatList
              data={filteredViewers}
              keyExtractor={(item) => item.uid}
              renderItem={({ item }) => (
                <View style={styles.optionCard}>
                  <View style={styles.optionIconContainer}>
                    <Ionicons name="person" size={20} color="#fff" />
                  </View>
                  <View style={styles.optionInfo}>
                    <Text style={styles.optionTitle}>{item.username || 'Anonymous'}</Text>
                    <Text style={styles.optionStatus}>
                      Watching since {item.joinedAt?.toDate?.().toLocaleTimeString() ?? 'unknown'}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.optionButton,
                      blockedUsers.includes(item.uid)
                        ? styles.optionButtonSuccess
                        : styles.optionButtonDanger,
                    ]}
                    onPress={() => toggleBlockUser(item.uid, item.username)}
                  >
                    <Text style={styles.optionButtonText}>
                      {blockedUsers.includes(item.uid) ? 'Unblock' : 'Block'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
              contentContainerStyle={{ paddingBottom: 20 }}
            />
          )}
        </View>
      );
    }

    return (
      <View style={styles.modalContent}>
        <View style={styles.optionsHeader}>
          <Text style={styles.optionsTitle}>Stream Settings</Text>
          <TouchableOpacity onPress={() => setVisible(false)}>
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.optionsSection}>
          <View style={styles.optionCard}>
            <View style={styles.optionIconContainer}>
              <Ionicons name={muted ? 'mic-off' : 'mic'} size={24} color={muted ? '#ff4444' : '#4CAF50'} />
            </View>
            <View style={styles.optionInfo}>
              <Text style={styles.optionTitle}>Microphone</Text>
              <Text style={styles.optionStatus}>{muted ? 'Currently muted' : 'Currently active'}</Text>
            </View>
            <TouchableOpacity
              style={[styles.optionButton, muted ? styles.optionButtonDanger : styles.optionButtonSuccess]}
              onPress={toggleMute}
            >
              <Text style={styles.optionButtonText}>{muted ? 'Unmute' : 'Mute'}</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.optionCard}>
            <View style={styles.optionIconContainer}>
              <Ionicons name="stats-chart" size={24} color="#FFD700" />
            </View>
            <View style={styles.optionInfo}>
              <Text style={styles.optionTitle}>Stream Stats</Text>
              <Text style={styles.optionStatus}>
                {viewerCount} {viewerCount === 1 ? 'viewer' : 'viewers'} • {messages.length} messages
              </Text>
            </View>
          </View>

          <View style={styles.optionCard}>
            <View style={styles.optionIconContainer}>
              <Ionicons name="people" size={24} color={ACCENT_COLOR} />
            </View>
            <View style={styles.optionInfo}>
              <Text style={styles.optionTitle}>Manage Viewers</Text>
              <Text style={styles.optionStatus}>Block or unblock viewers</Text>
            </View>
            <TouchableOpacity
              style={[styles.optionButton, styles.optionButtonDanger]}
              disabled={isLoading}
              onPress={handleOpenBlockView}
            >
              <Text style={styles.optionButtonText}>
                {isLoading ? 'Loading...' : 'Manage'}
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.endStreamButton}
            onPress={() => {
              Alert.alert('End Stream?', 'Are you sure you want to end your live stream?', [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'End Stream',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      rtcEngineRef.current?.leaveChannel();
                      rtcEngineRef.current?.release();
                      await updateDoc(doc(db, 'livestreams', channelName), { isLive: false });
                      navigation.replace('MainApp');
                    } catch (err) {
                      console.error('Failed to end stream:', err);
                    }
                  },
                },
              ]);
            }}
          >
            <Ionicons name="power" size={24} color="#fff" style={styles.endStreamIcon} />
            <Text style={styles.endStreamText}>End Stream</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={() => {
        console.log('Modal closing via onRequestClose');
        if (showBlockView) {
          setShowBlockView(false);
        } else {
          setVisible(false);
        }
      }}
    >
      <View style={styles.modalOverlay}>
        {renderContent()}
      </View>
    </Modal>
  );
};

export default StreamSettingsModal;
