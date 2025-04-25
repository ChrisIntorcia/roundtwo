import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { getFirestore, collection, query, where, onSnapshot, orderBy, getDoc, doc } from 'firebase/firestore';
import { auth } from '../../firebaseConfig';

const db = getFirestore();

export default function InboxScreen() {
  const navigation = useNavigation();
  const currentUserId = auth.currentUser?.uid;
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentUserId) return;

    const q = query(
      collection(db, 'chats'),
      where('users', 'array-contains', currentUserId),
      orderBy('updatedAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const chatDocs = snapshot.docs;
      const chatData = [];

      for (const docSnap of chatDocs) {
        const chat = docSnap.data();
        const otherUserId = chat.users.find((uid) => uid !== currentUserId);

        let otherUsername = 'User';
        try {
          const userDoc = await getDoc(doc(db, 'users', otherUserId));
          if (userDoc.exists()) {
            otherUsername = userDoc.data()?.username || 'User';
          }
        } catch (err) {
          console.warn('Failed to fetch other user:', err);
        }

        chatData.push({
          id: docSnap.id,
          lastMessage: chat.lastMessage,
          otherUserId,
          otherUsername,
        });
      }

      setConversations(chatData);
      setLoading(false);
    });

    return unsubscribe;
  }, [currentUserId]);

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.chatItem}
      onPress={() =>
        navigation.navigate('MessagesScreen', {
          otherUserId: item.otherUserId,
          otherUsername: item.otherUsername,
        })
      }
    >
      <Text style={styles.username}>@{item.otherUsername}</Text>
      <Text style={styles.lastMessage} numberOfLines={1}>
        {item.lastMessage}
      </Text>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#E76A54" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={conversations}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 50 }}>No messages yet</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  list: { padding: 10 },
  chatItem: {
    borderBottomWidth: 1,
    borderColor: '#ddd',
    paddingVertical: 12,
  },
  username: {
    fontWeight: 'bold',
    fontSize: 16,
    color: '#000',
  },
  lastMessage: {
    color: '#666',
    marginTop: 4,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
