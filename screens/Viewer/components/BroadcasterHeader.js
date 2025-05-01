import React from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

export default function BroadcasterHeader({ broadcaster, isFollowing, toggleFollow, viewerCount, navigation }) {
  return (
    <View style={styles.headerRow}>
      <View style={styles.leftRow}>
        <TouchableOpacity
          style={styles.broadcasterInfo}
          onPress={() => {
            if (broadcaster?.id) {
              navigation.navigate('ProfileScreen', {
                userId: broadcaster.id,
                username: broadcaster.username,
              });
            }
          }}
        >
          <Image
            source={
              broadcaster?.avatarUrl
                ? { uri: broadcaster.avatarUrl }
                : require('../../../assets/nothing.png')
            }
            style={styles.avatar}
          />
          <View style={styles.nameContainer}>
            <Text style={styles.hostName}>@{broadcaster?.username || 'seller'}</Text>
            {broadcaster?.displayName && (
              <Text style={styles.displayName}>{broadcaster.displayName}</Text>
            )}
          </View>
        </TouchableOpacity>

        <TouchableOpacity 
          style={[
            styles.follow, 
            isFollowing && styles.following
          ]} 
          onPress={toggleFollow}
        >
          <Text style={styles.followText}>
            {isFollowing ? 'Following' : 'Follow'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.rightRow}>
        <View style={styles.viewerStat}>
          <Icon name="people" size={15} color="#fff" style={styles.viewerIcon} />
          <Text style={styles.viewerCount}>{viewerCount}</Text>
        </View>

        <TouchableOpacity 
          onPress={() => navigation.goBack()} 
          style={styles.closeButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Icon name="close" size={22} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 10,
    alignItems: 'center',
  },
  leftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  broadcasterInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 35,
    height: 35,
    borderRadius: 17.5,
    marginRight: 7,
    borderWidth: 1.5,
    borderColor: '#E76A54',
  },
  nameContainer: {
    flex: 1,
  },
  hostName: {
    color: '#fff',
    fontWeight: '500',
    fontSize: 14,
  },
  displayName: {
    color: '#ccc',
    fontSize: 11,
    marginTop: 1,
  },
  follow: {
    backgroundColor: '#E76A54',
    borderRadius: 15,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginLeft: 8,
  },
  following: {
    backgroundColor: 'rgba(231, 106, 84, 0.3)',
    borderWidth: 1,
    borderColor: '#E76A54',
  },
  followText: {
    color: '#fff',
    fontWeight: '500',
    fontSize: 13,
  },
  rightRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewerStat: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(231, 106, 84, 0.3)',
    borderWidth: 1,
    borderColor: '#E76A54',
    borderRadius: 15,
    paddingHorizontal: 11,
    paddingVertical: 5,
    marginRight: 10,
  },
  viewerIcon: {
    marginRight: 5,
  },
  viewerCount: {
    color: '#fff',
    fontWeight: '500',
    fontSize: 13,
  },
  closeButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
