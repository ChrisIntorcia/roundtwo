import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { RtcSurfaceView, VideoSourceType } from 'react-native-agora';

const StreamVideo = ({ joined, remoteUid }) => {
  if (!joined || !remoteUid) {
    return (
      <View style={styles.waitingContainer}>
        <Text style={styles.waitingText}>Waiting for stream to start...</Text>
      </View>
    );
  }

  return (
    <RtcSurfaceView
      style={styles.videoContainer}
      canvas={{ uid: remoteUid, sourceType: VideoSourceType.VideoSourceRemote }}
    />
  );
};

const styles = StyleSheet.create({
  videoContainer: {
    flex: 1,
  },
  waitingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000',
  },
  waitingText: {
    color: '#fff',
    fontSize: 16,
  },
});

export default StreamVideo; 