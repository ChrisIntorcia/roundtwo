import { filterText } from '../../utils/profanityFilter';

const startStream = async () => {
  if (!title.trim()) {
    Alert.alert('Error', 'Please enter a stream title');
    return;
  }

  // Filter the stream title
  const filteredTitle = filterText(title);

  const streamData = {
    title: filteredTitle,
    userId: auth.currentUser.uid,
    username: userData?.username || auth.currentUser.email.split('@')[0],
    startedAt: new Date(),
    isLive: true,
  };

  // ... existing code ...
}; 