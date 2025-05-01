import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  Alert,
  StyleSheet,
} from 'react-native';

export default function ViewerOptionsModal({
  visible,
  setVisible,
  muted,
  setMuted,
  rtcEngineRef,
}) {
  const handleToggleMute = () => {
    const engine = rtcEngineRef.current;
    if (engine) {
      engine.muteAllRemoteAudioStreams(!muted);
      setMuted(!muted);
    }
    setVisible(false);
  };

  const handleReport = () => {
    setVisible(false);
    Alert.alert('Report Submitted', "Thanks for reporting. We'll take a look!");
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <TouchableOpacity
        style={styles.overlay}
        onPress={() => setVisible(false)}
        activeOpacity={1}
      >
        <View style={styles.modal}>
          <TouchableOpacity onPress={handleToggleMute}>
            <Text style={styles.optionText}>{muted ? 'Unmute Stream' : 'Mute Stream'}</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleReport}>
            <Text style={styles.optionText}>Report Stream</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  modal: {
    position: 'absolute',
    bottom: 80,
    right: 20,
    backgroundColor: '#1a1a1a',
    borderRadius: 12,
    padding: 16,
  },
  optionText: {
    color: '#fff',
    paddingVertical: 8,
  },
});
