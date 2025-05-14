import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Image,
  Alert,
  TouchableOpacity,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

// helper to format ISO → "Thursday at 7PM"
const formatDate = iso => {
  const d = new Date(iso);
  const weekday = d.toLocaleDateString('en-US', { weekday: 'long' });
  let hour = d.getHours();
  const ampm = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12 || 12;
  return `${weekday} at ${hour}${ampm}`;
};

const DropCard = ({ title, time, imageUrl }) => {
  const source = typeof imageUrl === 'string'
    ? { uri: imageUrl }
    : imageUrl;

  const handlePress = () => {
    Alert.alert('Streaming Live', time);
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

const DailyDrops = () => {
  const [drops, setDrops] = useState([]);

  useEffect(() => {
    const fetchDrops = async () => {
      const db = getFirestore();
      const snap = await getDocs(collection(db, 'scheduledStreams'));
      const list = snap.docs.map(doc => {
        const data = doc.data();
        return {
          title: data.title,
          time: formatDate(data.date),
          imageUrl: data.coverImage,
        };
      });
      setDrops(list);
    };
    fetchDrops();
  }, []);

  const handleViewAll = () => {
    if (drops.length === 0) {
      Alert.alert('No scheduled streams', 'There are no streams scheduled.');
      return;
    }
    const listText = drops
      .map((d, i) => `${i + 1}. ${d.title} — ${d.time}`)
      .join('\n');
    Alert.alert('Scheduled Streams', listText);
  };

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
        keyExtractor={(_, index) => index.toString()}
        contentContainerStyle={styles.listContent}
        showsHorizontalScrollIndicator={false}
        renderItem={({ item }) => (
          <DropCard
            title={item.title}
            time={item.time}
            imageUrl={item.imageUrl}
          />
        )}
      />
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
    fontSize: 14,
    color: '#6C63FF',
  },
  listContent: {
    paddingBottom: 4,
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
