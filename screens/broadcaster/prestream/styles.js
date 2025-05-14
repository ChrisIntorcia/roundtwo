import { StyleSheet, Dimensions } from 'react-native';
const { width } = Dimensions.get('window');
const CARD_PADDING = 20;
const THUMBNAIL_SIZE = width - CARD_PADDING * 4;

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: CARD_PADDING,
    backgroundColor: '#f8f9fa',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 10,
    marginTop: 10,
  },
  input: {
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    color: '#2c3e50',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  thumbnailContainer: {
    width: THUMBNAIL_SIZE,
    height: THUMBNAIL_SIZE * (9 / 16),
    borderRadius: 10,
    overflow: 'hidden',
    marginButtom: 20,
    backgroundColor: '#f8f9fa',
  },
  thumbnailPlaceholder: {
    borderWidth: 2,
    borderColor: '#e9ecef',
    borderStyle: 'dashed',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  uploadPrompt: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginTop: 10,
  },
  uploadSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 5,
  },
  startButton: {
    backgroundColor: '#E76A54',
    borderRadius: 30,
    padding: 15,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  startButtonDisabled: {
    backgroundColor: '#213E4D',
  },
  startButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 10,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    marginLeft: 10,
  },
});
