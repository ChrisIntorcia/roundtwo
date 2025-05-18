import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  Alert,
  TouchableOpacity,
  Modal,
  Dimensions
} from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { getFirestore, collection, query, where, orderBy, onSnapshot, getDocs, Timestamp } from 'firebase/firestore';
import { useNavigation } from '@react-navigation/native';

const { width } = Dimensions.get('window');

// helper to format date to "Thursday, May 15th at 11PM EST"
const formatDate = dateObj => {
  // Handle both Timestamp and regular Date objects
  const d = dateObj?.toDate?.() || new Date(dateObj);
  if (isNaN(d.getTime())) {
    console.error('Invalid date:', dateObj);
    return 'Invalid Date';
  }
  
  const weekday = d.toLocaleDateString('en-US', { weekday: 'long' });
  const month = d.toLocaleDateString('en-US', { month: 'long' });
  const day = d.getDate();
  const daySuffix = getDaySuffix(day);
  let hour = d.getHours();
  const ampm = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12 || 12;
  
  return `${weekday}, ${month} ${day}${daySuffix} at ${hour}${ampm} EST`;
};

// Helper to get the correct suffix for the day
const getDaySuffix = (day) => {
  if (day > 3 && day < 21) return 'th';
  switch (day % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
};

const DropCard = ({ title, time, imageUrl, id }) => {
  const navigation = useNavigation();
  const source = typeof imageUrl === 'string'
    ? { uri: imageUrl }
    : imageUrl;

  const handlePress = () => {
    navigation.navigate('EventDetails', { eventId: id });
  };

  return (
    <TouchableOpacity style={styles.card} onPress={handlePress}>
      <Image source={source} style={styles.image} resizeMode="cover" />
      <View style={styles.cardContent}>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        <View style={styles.timeRow}>
          <Ionicons name="time-outline" size={12} color="#777" />
          <Text style={styles.timeText}>{time}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const DailyDrops = ({ excludeStreamId }) => {
  const [drops, setDrops] = useState([]);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const db = getFirestore();
    const now = new Date();
    
    const q = query(
      collection(db, 'scheduledStreams'),
      where('date', '>=', now),
      orderBy('date', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      console.log('DailyDrops received update with', snapshot.docs.length, 'streams');
      const list = snapshot.docs
        .map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            title: data.title,
            time: formatDate(data.date),
            imageUrl: data.coverImage,
            date: data.date,
            description: data.description || '',
          };
        })
        .filter(stream => stream.id !== excludeStreamId) // Filter out the featured stream
        .slice(0, 3); // Only show next 3 streams
      setDrops(list);
    }, (error) => {
      console.error('Error fetching drops:', error);
    });

    return () => unsubscribe();
  }, [excludeStreamId]); // Add excludeStreamId to dependency array

  const handleViewAll = () => {
    if (drops.length === 0) {
      Alert.alert('No scheduled streams', 'There are no streams scheduled.');
      return;
    }
    setShowModal(true);
  };

  const renderStreamItem = ({ item }) => (
    <View style={styles.streamItem}>
      <Image 
        source={{ uri: item.imageUrl }} 
        style={styles.streamImage}
      />
      <View style={styles.streamInfo}>
        <Text style={styles.streamTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.streamTime}>{item.time}</Text>
        {item.description ? (
          <Text style={styles.streamDescription} numberOfLines={2}>
            {item.description}
          </Text>
        ) : null}
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle}>Daily Drops</Text>
        <TouchableOpacity onPress={handleViewAll}>
          <Text style={styles.viewAll}>View all</Text>
        </TouchableOpacity>
      </View>
      <FlatList
        data={drops}
        horizontal
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsHorizontalScrollIndicator={false}
        renderItem={({ item }) => (
          <DropCard
            id={item.id}
            title={item.title}
            time={item.time}
            imageUrl={item.imageUrl}
          />
        )}
      />

      <Modal
        visible={showModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Upcoming Streams</Text>
              <TouchableOpacity 
                onPress={() => setShowModal(false)}
                style={styles.closeButton}
              >
                <MaterialIcons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={drops}
              renderItem={renderStreamItem}
              keyExtractor={item => item.id}
              contentContainerStyle={styles.modalList}
              showsVerticalScrollIndicator={false}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>No streams scheduled</Text>
                </View>
              }
            />
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 16,
    paddingHorizontal: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  viewAll: {
    fontSize: 15,
    color: '#E76A54',
    fontWeight: '600',
  },
  listContent: {
    paddingBottom: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#222',
  },
  closeButton: {
    padding: 4,
  },
  modalList: {
    padding: 16,
  },
  streamItem: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  streamImage: {
    width: 120,
    height: 120,
    resizeMode: 'cover',
  },
  streamInfo: {
    flex: 1,
    padding: 12,
    justifyContent: 'center',
  },
  streamTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#222',
    marginBottom: 4,
  },
  streamTime: {
    fontSize: 14,
    color: '#E76A54',
    fontWeight: '500',
    marginBottom: 4,
  },
  streamDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 18,
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
  card: {
    width: 260,
    borderRadius: 12,
    overflow: 'hidden',
    marginRight: 12,
    backgroundColor: '#fff',
    elevation: 2,
  },
  image: {
    width: '100%',
    height: 130,
    backgroundColor: '#eee',
  },
  cardContent: {
    padding: 12,
  },
  title: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 4,
    color: '#111',
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeText: {
    marginLeft: 4,
    fontSize: 12,
    color: '#777',
  },
});

export default DailyDrops;
