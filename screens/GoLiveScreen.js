import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Button,
  StyleSheet,
  Platform,
  PermissionsAndroid,
  TextInput,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import {
  createAgoraRtcEngine,
  ChannelProfileType,
  ClientRoleType,
  RtcSurfaceView,
} from 'react-native-agora';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';

const saveStreamToFirestore = async (userId, userName) => {
  await setDoc(doc(db, 'livestreams', userId), {
    streamer: userName,
    channel: CHANNEL_NAME,
    thumbnailUrl: 'https://link-to-thumbnail',
    viewers: 0,
    isLive: true,
  });
};

const APP_ID = '262ef45d2c514a5ebb129a836c4bff93';
const CHANNEL_NAME = 'livestream';

export default function GoLiveScreen() {
  const [joined, setJoined] = useState(false);
  const [engineReady, setEngineReady] = useState(false);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [purchaseMessage, setPurchaseMessage] = useState(null);
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

        engine.setClientRole(ClientRoleType.ClientRoleBroadcaster);
        engine.enableVideo();
        engine.startPreview();

        engine.registerEventHandler({
          onJoinChannelSuccess: (connection, uid, elapsed) => {
            console.log('✅ Joined channel', connection.channelId, uid);
            setJoined(true);
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

  const startLiveStream = async () => {
    if (!engineReady || !rtcEngineRef.current) return;
    try {
      await saveStreamToFirestore('userId', 'userName'); // replace with actual values
      rtcEngineRef.current.joinChannel('', CHANNEL_NAME, 0, {});
    } catch (err) {
      console.log('Join error', err);
    }
  };

  const sendMessage = () => {
    if (messageText.trim()) {
      const newMessage = { id: Date.now().toString(), text: messageText };
      setMessages((prev) => [...prev, newMessage]);
      setMessageText('');
    }
  };

  const makePurchase = () => {
    setPurchaseMessage('🛍️ Thanks for your purchase!');
    setTimeout(() => setPurchaseMessage(null), 3000);
  };

  return (
    <View style={styles.container}>
      {joined ? (
        <>
          <RtcSurfaceView
            style={styles.video}
            canvas={{ uid: 0, renderMode: 1 }}
          />

          <FlatList
            data={messages}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <Text style={styles.message}>{item.text}</Text>}
            style={styles.chatBox}
          />

          <View style={styles.inputRow}>
            <TextInput
              value={messageText}
              onChangeText={setMessageText}
              placeholder="Type a message..."
              style={styles.input}
            />
            <Button title="Send" onPress={sendMessage} />
          </View>

          <TouchableOpacity style={styles.purchaseButton} onPress={makePurchase}>
            <Text style={styles.purchaseText}>💳 Buy Now</Text>
          </TouchableOpacity>

          {purchaseMessage && <Text style={styles.purchaseConfirm}>{purchaseMessage}</Text>}
        </>
      ) : (
        <Button title="Start Live Stream" onPress={startLiveStream} disabled={!engineReady} />
      )}

      <Text style={styles.infoText}>{joined ? '🔴 You are live!' : 'Ready to go live'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  video: { width: '100%', height: '50%' },
  infoText: { marginTop: 16, fontSize: 18, fontWeight: 'bold' },
  chatBox: { flex: 1, width: '100%', paddingHorizontal: 20, marginTop: 10 },
  message: { fontSize: 16, paddingVertical: 4 },
  inputRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginBottom: 10 },
  input: { flex: 1, borderColor: '#ccc', borderWidth: 1, borderRadius: 8, padding: 8, marginRight: 10 },
  purchaseButton: { backgroundColor: '#2196F3', padding: 10, borderRadius: 8, marginVertical: 10 },
  purchaseText: { color: '#fff', fontWeight: 'bold' },
  purchaseConfirm: { fontSize: 16, color: 'green', marginTop: 10 },
});
