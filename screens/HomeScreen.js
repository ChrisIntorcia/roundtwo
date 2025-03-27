import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, Image, TouchableOpacity } from 'react-native';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '../firebaseConfig'; // make sure this points to your Firestore setup
import { useNavigation } from '@react-navigation/native';

export default function HomeScreen() {
  const [streams, setStreams] = useState([]);
  const navigation = useNavigation();

  useEffect(() => {
    const q = query(collection(db, 'livestreams'), where('isLive', '==', true));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const liveStreams = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setStreams(liveStreams);
    });

    return () => unsubscribe();
  }, []);

  const renderStream = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('ViewerScreen', { channel: item.channel })}
    >
      <Image source={{ uri: item.thumbnailUrl }} style={styles.thumbnail} />
      <View style={styles.liveBadge}>
        <Text style={styles.liveText}>Live • {item.viewers}</Text>
      </View>
      <Text style={styles.streamer}>{item.streamer}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.header}>📺 Live Streams</Text>
      <FlatList
        data={streams}
        renderItem={renderStream}
        keyExtractor={(item) => item.id}
        numColumns={2}
        contentContainerStyle={styles.grid}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { fontSize: 24, fontWeight: 'bold', padding: 16 },
  grid: { paddingHorizontal: 10 },
  card: {
    flex: 1,
    margin: 8,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#eee',
  },
  thumbnail: { width: '100%', height: 150 },
  liveBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: 'red',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  liveText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  streamer: { padding: 8, fontWeight: '600' },
});
