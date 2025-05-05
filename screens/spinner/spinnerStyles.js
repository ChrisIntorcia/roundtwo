import { StyleSheet, Dimensions, Platform } from 'react-native';

const { width } = Dimensions.get('window');
const WHEEL_SIZE = width * 0.85;

const spinnerStyles = StyleSheet.create({
  container: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
    marginBottom: 50,
  },
  indicator: {
    position: 'absolute',
    top: -20,
    left: '50%',
    transform: [{ translateX: -25 }],
    width: 0,
    height: 0,
    zIndex: 30,
    borderLeftWidth: 16,
    borderRightWidth: 16,
    borderTopWidth: 32,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#E76A54',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  
  wheelContainer: {
    width: WHEEL_SIZE,
    height: WHEEL_SIZE,
    borderRadius: WHEEL_SIZE / 2,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 15,
    borderWidth: 1,
    borderColor: 'rgba(231, 106, 84, 0.1)',
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
      },
      android: {
        elevation: 15,
      },
    }),
  },
  centerCap: {
    position: 'absolute',
    top: WHEEL_SIZE / 2 - 16,
    left: WHEEL_SIZE / 2 - 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fff',
    borderColor: '#E76A54',
    borderWidth: 3,
    zIndex: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  countdownContainer: {
    position: 'absolute',
    top: WHEEL_SIZE / 2 - 30,
    left: WHEEL_SIZE / 2 - 30,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(231, 106, 84, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
    borderWidth: 2,
    borderColor: '#fff',
  },
  countdownText: {
    color: '#fff',
    fontSize: 36,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },

  // ✅ Confetti container
  confettiOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 50,
    pointerEvents: 'none',
  },

  // ✅ Spin result popup
  resultModal: {
    position: 'absolute',
    bottom: 100,
    left: 20,
    right: 20,
    padding: 25,
    backgroundColor: '#fff',
    borderRadius: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 15,
    zIndex: 99,
    borderWidth: 1,
    borderColor: 'rgba(231, 106, 84, 0.2)',
  },
  resultText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#213E4D',
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },

  // ✅ Disabled spin button
  spinButtonDisabled: {
    backgroundColor: 'rgba(204, 204, 204, 0.7)',
    opacity: 0.7,
  },

  // ✅ Jackpot glow effect
  jackpotGlow: {
    position: 'absolute',
    width: WHEEL_SIZE * 1.2,
    height: WHEEL_SIZE * 1.2,
    borderRadius: (WHEEL_SIZE * 1.2) / 2,
    backgroundColor: 'rgba(255, 215, 0, 0.3)',
    zIndex: 5,
    top: -(WHEEL_SIZE * 0.1),
    left: -(WHEEL_SIZE * 0.1),
    shadowColor: '#FFD700',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
});

export const WHEEL_DIMENSIONS = {
  size: WHEEL_SIZE,
};

export default spinnerStyles;
