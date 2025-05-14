import React from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { styles } from './styles';

export function PreStreamForm({
  thumbnailLocalUri,
  streamTitle,
  isLoading,
  setStreamTitle,
  pickThumbnail,
  startLiveStream,
}) {
  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.container}>
        <Text style={styles.sectionTitle}>Stream Title</Text>
        <TextInput
          placeholder="Enter an engaging title for your stream"
          value={streamTitle}
          onChangeText={setStreamTitle}
          style={styles.input}
          placeholderTextColor="#999"
          maxLength={50}
        />

        <Text style={styles.sectionTitle}>Stream Thumbnail</Text>
        <TouchableOpacity
          style={[
            styles.thumbnailContainer,
            !thumbnailLocalUri && styles.thumbnailPlaceholder,
          ]}
          onPress={pickThumbnail}
          disabled={isLoading}
        >
          {thumbnailLocalUri ? (
            <Image source={{ uri: thumbnailLocalUri }} style={styles.thumbnail} />
          ) : (
            <View style={styles.uploadPrompt}>
              <MaterialIcons name="add-photo-alternate" size={40} color="#666" />
              <Text style={styles.uploadText}>Upload Thumbnail</Text>
              <Text style={styles.uploadSubtext}>Tap to choose an image</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.startButton,
            (isLoading || !thumbnailLocalUri) && styles.startButtonDisabled,
          ]}
          onPress={startLiveStream}
          disabled={isLoading || !thumbnailLocalUri}
        >
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color="#fff" />
              <Text style={styles.loadingText}>Preparing Stream...</Text>
            </View>
          ) : (
            <>
              <MaterialIcons name="live-tv" size={24} color="#fff" />
              <Text style={styles.startButtonText}>Go Live</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </TouchableWithoutFeedback>
  );
}