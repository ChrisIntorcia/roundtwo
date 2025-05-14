import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  TouchableOpacity,
  ActivityIndicator,
  Alert
} from 'react-native';
import { getFirestore, collection, query, where, orderBy, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { auth } from '../firebaseConfig';
import CustomHeader from '../components/CustomHeader';
import { Swipeable } from 'react-native-gesture-handler';
import { MaterialIcons } from '@expo/vector-icons';

const ScheduledStreams = ({ navigation }) => {
  const [streams, setStreams] = useState([]);
  const [loading, setLoading] = useState(true);
  const db = getFirestore();

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      console.log('No user found');
      return;
    }

    console.log('Fetching streams for user:', user.uid);
    const q = query(
      collection(db, 'scheduledStreams'),
      where('userId', '==', user.uid),
      orderBy('date', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      console.log('Received snapshot with', snapshot.docs.length, 'documents');
      const streamList = snapshot.docs.map(doc => {
        const data = doc.data();
        console.log('Stream data:', data);
        return {
          id: doc.id,
          ...data
        };
      });
      setStreams(streamList);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching streams:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const formatDateTime = (dateObj) => {
    // Handle both Timestamp and regular Date objects
    const date = dateObj instanceof Date ? dateObj : dateObj?.toDate?.() || new Date(dateObj);
    return date.toLocaleString('en-US', {
      timeZone: 'America/New_York',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      hour12: true
    }) + ' EST';
  };

  const handleDelete = async (streamId) => {
    try {
      await deleteDoc(doc(db, 'scheduledStreams', streamId));
      Alert.alert('Success', 'Stream deleted successfully');
    } catch (error) {
      console.error('Error deleting stream:', error);
      Alert.alert('Error', 'Failed to delete stream');
    }
  };

  const confirmDelete = (streamId) => {
    Alert.alert(
      'Delete Stream',
      'Are you sure you want to delete this scheduled stream?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', onPress: () => handleDelete(streamId), style: 'destructive' }
      ]
    );
  };

  const renderRightActions = (streamId) => {
    return (
      <View style={styles.swipeActions}>
        <TouchableOpacity
          style={[styles.swipeAction, styles.editAction]}
          onPress={() => navigation.navigate('EditScheduledStream', { streamId })}
        >
          <MaterialIcons name="edit" size={24} color="#FFF" />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.swipeAction, styles.deleteAction]}
          onPress={() => confirmDelete(streamId)}
        >
          <MaterialIcons name="delete" size={24} color="#FFF" />
        </TouchableOpacity>
      </View>
    );
  };

  const renderStreamItem = ({ item }) => (
    <Swipeable renderRightActions={() => renderRightActions(item.id)}>
      <TouchableOpacity style={styles.streamCard}>
        {item.coverImage && (
          <Image source={{ uri: item.coverImage }} style={styles.thumbnail} />
        )}
        <View style={styles.streamInfo}>
          <Text style={styles.streamTitle}>{item.title}</Text>
          <Text style={styles.streamDate}>{formatDateTime(item.date)}</Text>
        </View>
      </TouchableOpacity>
    </Swipeable>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#213E4D" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CustomHeader title="Scheduled Streams" showBack />
      {streams.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No scheduled streams yet</Text>
          <TouchableOpacity 
            style={styles.scheduleButton}
            onPress={() => navigation.navigate('ScheduleStream')}
          >
            <Text style={styles.scheduleButtonText}>Schedule a Stream</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={streams}
          renderItem={renderStreamItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContainer}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F9F9',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContainer: {
    padding: 16,
  },
  streamCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  thumbnail: {
    width: '100%',
    height: 180,
    resizeMode: 'cover',
  },
  streamInfo: {
    padding: 16,
  },
  streamTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#213E4D',
    marginBottom: 8,
  },
  streamDate: {
    fontSize: 14,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 20,
  },
  scheduleButton: {
    backgroundColor: '#213E4D',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 30,
  },
  scheduleButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  swipeActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  swipeAction: {
    width: 80,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editAction: {
    backgroundColor: '#213E4D',
  },
  deleteAction: {
    backgroundColor: '#E76A54',
  },
});

export default ScheduledStreams; 