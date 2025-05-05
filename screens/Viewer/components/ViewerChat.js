import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  addDoc,
  doc,
  getDoc,
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
  styles
}) {
  useEffect(() => {
    const chatQuery = query(
      collection(db, 'livestreams', channel, 'messages'),
      orderBy('createdAt')
    );
    const unsubChat = onSnapshot(chatQuery, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
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

  return (
    <>
      <BlurView intensity={20} tint="dark" style={styles.chatOverlay}>
          {messages.slice(-4).map((item, index) => {
            const opacityLevels = [0.5, 1, 1, 1];
            const opacity = opacityLevels[index];
            return (
              <Text key={item.id} style={[styles.chatMessage, { opacity }]}>
                <Text style={styles.chatSender}>{item.sender}: </Text>
                {item.text}
              </Text>
            );
          })}
        </BlurView>

  
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
    </>
  );  
}
