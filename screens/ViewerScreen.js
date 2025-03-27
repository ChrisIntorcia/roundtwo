import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Platform,
  PermissionsAndroid,
} from 'react-native';
import {
  createAgoraRtcEngine,
  ChannelProfileType,
  ClientRoleType,
  RtcSurfaceView,
} from 'react-native-agora';
import { useRoute } from '@react-navigation/native';

const APP_ID = '262ef45d2c514a5ebb129a836c4bff93';

export default function ViewerScreen() {
  const route = useRoute();
  const { channel } = route.params || {}; // channel passed from HomeScreen

  const [joined, setJoined] = useState(false);
  const [engineReady, setEngineReady] = useState(false);
  const [remoteUid, setRemoteUid] = useState(null); // ✅ Store broadcaster UID
  const rtcEngineRef = useRef(null);

  useEffect(() => {
    const init = async () => {
      try {
        if (Platform.OS === 'android') {
          await PermissionsAndroid.requestMultiple([
            PermissionsAndroid.PERMISSIONS.CAMERA,
            PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          ]);
        }

        const engine = createAgoraRtcEngine();
        rtcEngineRef.current = engine;

        engine.initialize({
          appId: APP_ID,
          channelProfile: ChannelProfileType.ChannelProfileLiveBroadcasting,
        });

        engine.setClientRole(ClientRoleType.ClientRoleAudience);
        engine.enableVideo();

        engine.registerEventHandler({
          onJoinChannelSuccess: (connection, uid, elapsed) => {
            console.log('✅ Joined channel as viewer:', connection.channelId, uid);
            setJoined(true);
          },
          onUserJoined: (connection, uid) => {
            console.log('👤 Broadcaster joined with UID:', uid);
            setRemoteUid(uid);
          },
          onError: (err) => {
            console.log('❌ Agora error:', err);
          },
        });

        setEngineReady(true);
      } catch (err) {
        console.error('Error initializing Agora:', err);
      }
    };

    init();

    return () => {
      if (rtcEngineRef.current) {
        rtcEngineRef.current.leaveChannel();
        rtcEngineRef.current.release();
        rtcEngineRef.current = null;
      }
    };
  }, []);

  const startWatchingStream = async () => {
    if (!engineReady || !rtcEngineRef.current) return;
    try {
      rtcEngineRef.current.joinChannel('', channel || 'livestream', 0, {});
    } catch (err) {
      console.log('Join error', err);
    }
  };

  useEffect(() => {
    if (engineReady) {
      startWatchingStream();
    }
  }, [engineReady]);

  return (
    <View style={styles.container}>
      {joined && remoteUid !== null ? (
        <RtcSurfaceView
          style={styles.video}
          canvas={{ uid: remoteUid, renderMode: 1 }} // ✅ Render remote stream
        />
      ) : (
        <Text style={styles.infoText}>Waiting for stream to start...</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  video: { width: '100%', height: '100%' },
  infoText: { color: '#fff', fontSize: 18 },
});
