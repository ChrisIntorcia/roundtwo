import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import { auth } from '../../firebaseConfig';
import {
  getFirestore,
  collection,
  addDoc,
  doc,
  setDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';

const db = getFirestore();

export default function MessagesScreen() {
  const route = useRoute();
  const { otherUserId, otherUsername } = route.params;
  const currentUserId = auth.currentUser.uid;
  const chatId = [currentUserId, otherUserId].sort().join('_');

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const flatListRef = useRef();

  useEffect(() => {
    const messagesRef = collection(db, 'chats', chatId, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setMessages(msgs);

      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    });
    return unsubscribe;
  }, [chatId]);

  const handleSend = async () => {
    if (input.trim() === '') return;

    const message = {
      text: input,
      senderId: currentUserId,
      timestamp: serverTimestamp(),
    };

    await setDoc(doc(db, 'chats', chatId), {
      users: [currentUserId, otherUserId],
      lastMessage: input,
      updatedAt: serverTimestamp(),
    }, { merge: true });

    await addDoc(collection(db, 'chats', chatId, 'messages'), message);
    setInput('');
  };

  const isSameDay = (a, b) => {
    return (
      a?.getFullYear?.() === b?.getFullYear?.() &&
      a?.getMonth?.() === b?.getMonth?.() &&
      a?.getDate?.() === b?.getDate?.()
    );
  };

  const formatDate = (timestamp) => {
    if (!timestamp?.toDate) return '';
    return timestamp.toDate().toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const renderItem = ({ item, index }) => {
    const isMine = item.senderId === currentUserId;
    const currentDate = item.timestamp?.toDate?.();
    const prevDate = index > 0 ? messages[index - 1]?.timestamp?.toDate?.() : null;
    const showDate = !isSameDay(currentDate, prevDate);

    return (
      <View>
        {showDate && (
          <View style={styles.dateWrapper}>
            <Text style={styles.dateText}>{formatDate(item.timestamp)}</Text>
          </View>
        )}
        <View
          style={[
            styles.messageBubble,
            isMine ? styles.myMessage : styles.theirMessage,
          ]}
        >
          <Text style={[styles.messageText, isMine && styles.whiteText]}>
            {item.text}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.inner}>
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.messagesContainer}
            style={styles.flatList}
          />
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              value={input}
              onChangeText={setInput}
              placeholder={`Message ${otherUsername}`}
              placeholderTextColor="#aaa"
            />
            <TouchableOpacity style={styles.sendButton} onPress={handleSend}>
              <Text style={styles.sendText}>Send</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  inner: { flex: 1 },
  flatList: { flex: 1 },
  messagesContainer: {
    paddingTop: 10,
    paddingHorizontal: 10,
    paddingBottom: 20,
  },
  dateWrapper: {
    alignItems: 'center',
    marginVertical: 10,
  },
  dateText: {
    fontSize: 13,
    color: '#888',
  },
  messageBubble: {
    maxWidth: '70%',
    padding: 10,
    borderRadius: 10,
    marginBottom: 10,
  },
  myMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#E76A54',
  },
  theirMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#eee',
  },
  messageText: {
    fontSize: 16,
  },
  whiteText: {
    color: '#fff',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 10,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: '#ccc',
    backgroundColor: '#fff',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    color: '#000',
  },
  sendButton: {
    marginLeft: 10,
    backgroundColor: '#E76A54',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  sendText: { color: '#fff', fontWeight: 'bold' },
});
