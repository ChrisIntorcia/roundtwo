import React from 'react';
import { View, Text, StyleSheet, FlatList, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// 1) Require your local image
const sourstreamImg = require('../../assets/sourstream.png');

const drops = [
  {
    title: 'New Gaming Peripherals',
    time: 'Thursday at 7PM',
    // 2) Use the require’d image here
    imageUrl: sourstreamImg,
  },
  {
    title: 'Limited Edition Merch',
    time: 'Tomorrow at 2PM',
    imageUrl: 'https://images.unsplash.com/photo-1488590528505-98d2b5aba04b?auto=format&fit=crop&w=500&h=280',
  },
  {
    title: 'Exclusive Stream Access',
    time: 'Wed at 9PM',
    imageUrl: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=500&h=280',
  },
];

const DropCard = ({ title, time, imageUrl }) => {
  // 3) Detect whether it's a URI or a bundled asset
  const source = typeof imageUrl === 'string'
    ? { uri: imageUrl }
    : imageUrl;

  return (
    <View style={styles.card}>
      <Image source={source} style={styles.image} resizeMode="cover" />
      <View style={styles.cardContent}>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        <View style={styles.timeRow}>
          <Ionicons name="time-outline" size={12} color="#777" />
          <Text style={styles.timeText}>{time}</Text>
        </View>
      </View>
    </View>
  );
};

const DailyDrops = () => {
  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle}>Daily Drops</Text>
        <Text style={styles.viewAll}>View all</Text>
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
