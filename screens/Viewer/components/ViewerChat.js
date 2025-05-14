import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Modal,
  StyleSheet,
  Button,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  doc,
  getDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { auth } from '../../../firebaseConfig';
import { filterText } from '../../../utils/profanityFilter';
import { BlurView } from 'expo-blur';

export default function ViewerChat({
  db,
  channel,
  messages,
  setMessages,
  chatInput,
  setChatInput,
  flatListRef,
  styles,
}) {
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportingMessage, setReportingMessage] = useState(null);
  const [reportReason, setReportReason] = useState('');

  useEffect(() => {
    const chatQuery = query(
      collection(db, 'livestreams', channel, 'messages'),
      orderBy('createdAt')
    );
    const unsubChat = onSnapshot(chatQuery, (snapshot) => {
      const msgs = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setMessages(msgs);
      flatListRef.current?.scrollToEnd({ animated: true });
    });

    return () => unsubChat();
  }, [channel]);

  const sendMessage = async () => {
    const user = auth.currentUser;
    if (!chatInput.trim() || !user) return;

    const userDoc = await getDoc(doc(db, 'users', user.uid));
    const senderName =
      userDoc.data()?.username ||
      userDoc.data()?.displayName ||
      user.email.split('@')[0];

    const filteredMessage = filterText(chatInput);

    await addDoc(collection(db, 'livestreams', channel, 'messages'), {
      text: filteredMessage,
      sender: senderName,
      createdAt: new Date(),
    });

    setChatInput('');
  };

  const openReport = (message) => {
    setReportingMessage(message);
    setReportReason('');
    setReportModalVisible(true);
  };

  const submitReport = async () => {
    if (!reportReason.trim() || !reportingMessage) {
      Alert.alert('Please enter a reason');
      return;
    }
    const user = auth.currentUser;
    await addDoc(collection(db, 'reports', 'messages'), {
      reporterId: user.uid,
      messageId: reportingMessage.id,
      channelId: channel,
      reason: reportReason,
      createdAt: serverTimestamp(),
    });
    setReportModalVisible(false);
    Alert.alert('Reported. Thank you.');
  };

  return (
    <>
      <View style={styles.chatOverlay}>
        {messages.slice(-4).map((item, index) => {
          const opacityLevels = [0.5, 1, 1, 1];
          const opacity = opacityLevels[index] || 1;
          return (
            <TouchableOpacity
              key={item.id}
              onLongPress={() => openReport(item)}
              activeOpacity={0.7}
              style={{ marginBottom: 4 }}
            >
              <Text style={[styles.chatMessage, { opacity }]}>  
                <Text style={styles.chatSender}>{item.sender}: </Text>
                {item.text}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.chatInputWrapper}
      >
        <TextInput
          value={chatInput}
          onChangeText={setChatInput}
          placeholder="Say something..."
          placeholderTextColor="#aaa"
          style={styles.chatInput}
          onSubmitEditing={sendMessage}
          returnKeyType="send"
        />
        <TouchableOpacity onPress={sendMessage}>
          <Text style={styles.sendButton}>Send</Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>

      <Modal
        visible={reportModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setReportModalVisible(false)}
      >
        <View style={modalStyles.overlay}>
          <View style={modalStyles.content}>
            <Text style={modalStyles.title}>Report Message</Text>
            <TextInput
              style={modalStyles.input}
              placeholder="Reason for reporting"
              value={reportReason}
              onChangeText={setReportReason}
            />
            <View style={modalStyles.buttons}>
              <Button title="Cancel" onPress={() => setReportModalVisible(false)} />
              <Button title="Submit" onPress={submitReport} />
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    width: '80%',
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 8,
    borderRadius: 4,
    marginBottom: 16,
  },
  buttons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
});
