import React, { useEffect, useState } from 'react';
import { Animated, View, Text, TouchableOpacity, StyleSheet, Share, Alert, Dimensions } from 'react-native';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDoc, updateDoc, setDoc } from 'firebase/firestore';
import { LinearGradient } from 'expo-linear-gradient';
import Spinner from '../spinner/Spinner'; // ✅ confirmed path

const MAX_SPINS_PER_DAY = 2;
const getTodayDateKey = () => new Date().toISOString().split('T')[0];

const PRIZES = [
  { label: '1 Entry', value: 1 },
  { label: '1 Entry', value: 1 },
  { label: '1 Entry', value: 1 },
  { label: '1 Entry', value: 1 },
  { label: '2 Entry', value: 2 },
  { label: '2 Entry', value: 2 },
  { label: '2 Entry', value: 2 },
  { label: '3 Entry', value: 3 },
  { label: '3 Entry', value: 3 },
  { label: 'Jackpot 5!', value: 5 },
  { label: '1 Entry + reSpin', value: 1, spinAgain: true },
  { label: '4x - Just Share', value: 0, requiresReshare: true, rewardOnShare: 4 }
];

const { width, height } = Dimensions.get('window');

export default function BrowsePage() {
  const [totalEntries, setTotalEntries] = useState(0);
  const [referralLink, setReferralLink] = useState('');
  const [spinCount, setSpinCount] = useState(0);
  const [hasShared, setHasShared] = useState(false);
  const [lastPrize, setLastPrize] = useState(null);
  const [showPrize, setShowPrize] = useState(false);
  const prizeScale = useState(new Animated.Value(0))[0];
  const auth = getAuth();
  const firestore = getFirestore();
  const user = auth.currentUser;

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      const userRef = doc(firestore, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const data = userSnap.data();
        setTotalEntries(data.giveawayEntries || 0);
        setSpinCount(data.spinCountToday || 0);
        setReferralLink(`https://stogora.com/?ref=${user.uid}`);
        const today = getTodayDateKey();
        if (data.lastSpinDate !== today) {
          await updateDoc(userRef, {
            spinCountToday: 0,
            lastSpinDate: today,
            hasSharedToday: false
          });
          setSpinCount(0);
          setHasShared(false);
        }
      }
    };
    fetchData();
  }, [user]);

  const handleShare = async () => {
    try {
      await Share.share({ message: referralLink });
      setHasShared(true);
    } catch (e) {
      console.error(e);
    }
  };

  const animatePrize = () => {
    setShowPrize(true);
    Animated.sequence([
      Animated.spring(prizeScale, {
        toValue: 1,
        useNativeDriver: true
      }),
      Animated.delay(2000),
      Animated.spring(prizeScale, {
        toValue: 0,
        useNativeDriver: true
      })
    ]).start(() => setShowPrize(false));
  };

  const handleSpinComplete = async (prize) => {
    if (!user) return;

    setLastPrize(prize);
    animatePrize();

    if (prize.requiresReshare) {
      Alert.alert('Share Again!', 'Share to double your prize.', [
        {
          text: 'Share',
          onPress: async () => {
            await handleShare();
            await applyReward(prize.rewardOnShare || 2);
            await incrementSpin();
          }
        }
      ]);
      return;
    }

    await applyReward(prize.value);
    if (!prize.spinAgain) {
      await incrementSpin();
    }
  };

  const applyReward = async (value) => {
    const newTotal = totalEntries + value;
    setTotalEntries(newTotal);
    await setDoc(doc(firestore, 'users', user.uid), {
      hasSharedToday: true
    }, { merge: true });
    setHasShared(true);
  };

  const incrementSpin = async () => {
    const newCount = spinCount + 1;
    setSpinCount(newCount);
    await setDoc(doc(firestore, 'users', user.uid), {
      spinCountToday: newCount,
      lastSpinDate: getTodayDateKey()
    }, { merge: true });
  };

  return (
    <LinearGradient colors={['#FFF5E8', '#FFFFFF']} style={styles.background}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.headerContainer}>
            <Text style={styles.header}>🎯 You have {totalEntries} entries</Text>
            <View style={styles.referralSection}>
              <Text style={styles.referralText}>Your Referral Link:</Text>
              <TouchableOpacity onPress={handleShare} style={styles.copyButton}>
                <Text style={styles.copyButtonText}>Share Link</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.spinnerContainer}>
          <Spinner
            prizes={PRIZES}
            onSpinComplete={handleSpinComplete}
            canSpin={true} // unlimited spins
/>
          </View>

          {showPrize && lastPrize && (
            <Animated.View
              style={[
                styles.prizeContainer,
                { transform: [{ scale: prizeScale }] }
              ]}
            >
              <Text style={styles.prizeText}>
                {lastPrize.value > 0
                  ? `🎉 You won ${lastPrize.value}x entries!`
                  : lastPrize.spinAgain
                  ? '🎁 Free spin!'
                  : lastPrize.requiresReshare
                  ? '🔄 Share to double!'
                  : '😅 Better luck next time!'}
              </Text>
            </Animated.View>
          )}

          <View style={styles.footer}>
            <Text style={styles.subheader}>
              🔄 1 free spin daily · Share for spins!
            </Text>
            <Text style={styles.cta}>
              Top 3 referrers win free Sour Champion candy. Watch live Thursday at 7PM.
            </Text>
          </View>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width,
    height,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 40,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerContainer: {
    alignItems: 'center',
    width: '100%',
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#213E4D',
    marginBottom: 20,
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  referralSection: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 15,
    borderRadius: 12,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  referralText: {
    fontSize: 16,
    color: '#213E4D',
    marginRight: 10,
  },
  copyButton: {
    backgroundColor: '#E76A54',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    shadowColor: '#E76A54',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  copyButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  spinnerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  prizeContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    padding: 25,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
    borderWidth: 1,
    borderColor: 'rgba(231, 106, 84, 0.2)',
    alignItems: 'center',
  }
  ,
  prizeText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#213E4D',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  prizeWrapper: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [
      { translateX: -150 },
      { translateY: -75 }
    ],
    width: 200,
    zIndex: 100,
  },
  footer: {
    width: '100%',
    alignItems: 'center',
    paddingTop: 20,
  },
  subheader: {
    fontSize: 16,
    color: '#213E4D',
    textAlign: 'center',
    marginBottom: 10,
    fontWeight: '500',
  },
  cta: {
    fontSize: 14,
    color: '#213E4D',
    textAlign: 'center',
    lineHeight: 20,
    opacity: 0.8,
  },
});
