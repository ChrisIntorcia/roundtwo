import React from 'react';
import { View, Text, StyleSheet, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const StreamCard = ({ imageUrl, username, title, viewerCount, isLive, featured = false }) => {
  return (
    <View style={[styles.card, featured && styles.featuredCard]}>
      <View style={[styles.imageWrapper, featured && styles.featuredImage]}>
        <Image
          source={{ uri: imageUrl }}
          style={styles.thumbnail}
          resizeMode="cover"
        />
        {isLive && (
          <View style={styles.liveBadge}>
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        )}
      </View>
      <View style={styles.infoContainer}>
        <View style={styles.headerRow}>
          <Text style={styles.username} numberOfLines={1}>{username}</Text>
          <View style={styles.viewerInfo}>
            <Ionicons name="people" size={16} color="#555" />
            <Text style={styles.viewerCount}>
              {viewerCount?.toLocaleString?.() || 0}
            </Text>
          </View>
        </View>
        <Text style={styles.title} numberOfLines={2}>{title}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: 12,
    backgroundColor: '#fff',
    overflow: 'hidden',
    elevation: 2,
  },
  featuredCard: {
    marginBottom: 20,
  },
  imageWrapper: {
    position: 'relative',
    width: '100%',
    height: 180,
    backgroundColor: '#eee',
  },
  featuredImage: {
    height: 300, // significantly larger
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  liveBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: '#DC2626',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  liveText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  infoContainer: {
    padding: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  username: {
    fontWeight: '600',
    fontSize: 15,
    color: '#111',
    flex: 1,
    marginRight: 8,
  },
  viewerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewerCount: {
    fontSize: 13,
    color: '#555',
    marginLeft: 4,
  },
  title: {
    fontSize: 14,
    color: '#333',
  },
});

export default StreamCard;
