import React, { useEffect, useState } from 'react';
import { Animated, View, Text, TouchableOpacity, StyleSheet, Share, Alert, Dimensions } from 'react-native';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDoc, updateDoc, setDoc, increment } from 'firebase/firestore';
import { LinearGradient } from 'expo-linear-gradient';
import Spinner from '../spinner/Spinner'; // ✅ confirmed path
import { Modal, ScrollView } from 'react-native';
import ShareButton from './Share';

const MAX_SPINS_PER_DAY = 2;
const getTodayDateKey = () => new Date().toLocaleDateString('en-CA'); // "YYYY-MM-DD" in Mountain Time

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
  const [availableSpins, setAvailableSpins] = useState(1);
  const [hasShared, setHasShared] = useState(false);
  const [lastPrize, setLastPrize] = useState(null);
  const [showPrize, setShowPrize] = useState(false);
  const prizeScale = useState(new Animated.Value(0))[0];
  const auth = getAuth();
  const firestore = getFirestore();
  const user = auth.currentUser;
  const [showRulesModal, setShowRulesModal] = useState(false);

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      try {
        // Fetch entries
        const entriesRef = doc(firestore, 'entries', user.uid);
        const entriesSnap = await getDoc(entriesRef);
        if (entriesSnap.exists()) {
          setTotalEntries(entriesSnap.data().entryCount || 0);
        } else {
          // Initialize entries if they don't exist
          await setDoc(entriesRef, {
            entryCount: 0,
            displayName: user.displayName || '',
            lastUpdated: new Date().toISOString()
          });
          setTotalEntries(0);
        }

        // Fetch user data
        const userRef = doc(firestore, 'users', user.uid);
        const userSnap = await getDoc(userRef);
        setReferralLink(`https://stogora.com/?ref=${user.uid}`);
        const today = getTodayDateKey();
        
        if (!userSnap.exists()) {
          // First-time user: create their doc
          await setDoc(userRef, {
            spinCountToday: 1,
            lastSpinDate: today,
            hasSharedToday: false
          });
          setAvailableSpins(1);
          setHasShared(false);
        } else {
          const data = userSnap.data();
          if (data.lastSpinDate !== today) {
            // New day: reset spins
            await updateDoc(userRef, {
              spinCountToday: 1,
              lastSpinDate: today,
              hasSharedToday: false
            });
            setAvailableSpins(1);
            setHasShared(false);
          } else {
            // Same day: use stored count
            setAvailableSpins(data.spinCountToday || 1);
            setHasShared(data.hasSharedToday || false);
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      }
    };
    fetchData();
  }, [user]);

  const handleShare = async () => {
    try {
      await Share.share({ message: referralLink });
      setHasShared(true);
      const newSpins = availableSpins + 1;
      setAvailableSpins(newSpins);
      
      // Update Firestore
      const userRef = doc(firestore, 'users', user.uid);
      await updateDoc(userRef, {
        spinCountToday: newSpins,
        hasSharedToday: true
      });
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
    if (!user || availableSpins <= 0) return;

    setLastPrize(prize);
    animatePrize();

    if (prize.requiresReshare) {
      Alert.alert('Share Again!', 'Share to double your prize.', [
        {
          text: 'Share',
          onPress: async () => {
            await handleShare();
            await applyReward(prize.rewardOnShare || 2);
          }
        }
      ]);
      return;
    }

    await applyReward(prize.value);
    const newSpins = availableSpins - 1;
    setAvailableSpins(newSpins);
    
    // Update Firestore
    const userRef = doc(firestore, 'users', user.uid);
    await updateDoc(userRef, {
      spinCountToday: newSpins
    });
  };

  const applyReward = async (value) => {
    try {
      const newTotal = totalEntries + value;
      setTotalEntries(newTotal);
      
      // Update entries in Firestore
      const entriesRef = doc(firestore, 'entries', user.uid);
      await updateDoc(entriesRef, {
        entryCount: newTotal,
        displayName: user.displayName || '',
        lastUpdated: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error applying reward:', error);
    }
  };

  return (
    <LinearGradient colors={['#FFF5E8', '#FFFFFF']} style={styles.background}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.headerContainer}>
            <Text style={styles.header}>🎯 You have {totalEntries} entries</Text>
            <Text style={styles.spinsText}>🎲 {availableSpins} spin{availableSpins !== 1 ? 's' : ''} remaining today</Text>
            <View style={styles.referralSection}>
              <Text style={styles.referralText}>Your Referral Link:</Text>
              <ShareButton onShare={handleShare} />
            </View>
          </View>

          <View style={styles.spinnerContainer}>
            <Spinner
              prizes={PRIZES}
              onSpinComplete={handleSpinComplete}
              canSpin={availableSpins > 0}
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
  <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', alignItems: 'center', marginTop: 4 }}>
    <Text style={styles.cta}>
      Every stream we give away hundreds of dollars of prizes to viewers! Share for entries and Watch live Thursdays at 7pm EST.{' '}
    </Text>
    <TouchableOpacity onPress={() => setShowRulesModal(true)}>
      <Text style={[styles.cta, { textDecorationLine: 'underline', fontWeight: 'bold' }]}>
       View Giveaway Rules
      </Text>
    </TouchableOpacity>
  </View>
</View>


      <Modal
  visible={showRulesModal}
  animationType="slide"
  transparent={true}
  onRequestClose={() => setShowRulesModal(false)}
>
  <View style={styles.modalOverlay}>
    <View style={styles.modalContent}>
      <ScrollView>
        <Text style={styles.rulesHeader}>🎯 Giveaway Official Rules</Text>
        <Text style={styles.rulesText}>
  No purchase necessary to enter or win. Open to legal residents of the United States who are 18 years of age or older. Void where prohibited.

  {"\n\n"}To enter, users may spin the prize wheel by either: (a) sharing their referral link, or (b) joining a livestream. Each user may receive up to 2 spins per day. Spins earn entries into a weekly giveaway.

  {"\n\n"}Giveaways are held live every Thursday at 7:00 PM EST during the livestream. Winners are selected at random from the pool of eligible entries and announced live. Odds of winning depend on the total number of entries received.

  {"\n\n"}Prizes vary weekly and may include digital items, gift cards, or physical goods. All prizes will be delivered electronically or via email, unless otherwise specified.

  {"\n\n"}This contest is in no way sponsored, endorsed, or administered by, or associated with Apple Inc.

  {"\n\n"}By participating, you agree to the official rules and decisions of Stogora, which are final and binding. For questions or support, contact support@stogora.com.
</Text>

        <TouchableOpacity onPress={() => setShowRulesModal(false)} style={styles.closeButton}>
          <Text style={styles.closeButtonText}>Close</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  </View>
</Modal>
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
    paddingTop: 40,
    paddingBottom: 20,
    alignItems: 'center',
  },
  headerContainer: {
    alignItems: 'center',
    width: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 15,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    marginBottom: 15,
  },
  header: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#213E4D',
    marginBottom: 10,
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  spinsText: {
    fontSize: 20,
    color: '#E76A54',
    marginBottom: 10,
    fontWeight: '600',
    backgroundColor: 'rgba(231, 106, 84, 0.1)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 15,
    overflow: 'hidden',
  },
  referralSection: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 12,
    borderRadius: 15,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(231, 106, 84, 0.1)',
  },
  referralText: {
    fontSize: 16,
    color: '#213E4D',
    marginRight: 10,
    fontWeight: '500',
  },
  spinnerContainer: {
    width: '100%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 10,
  },
  prizeContainer: {
    position: 'absolute',
    bottom: 15,
    left: 20,
    right: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    padding: 20,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
    borderWidth: 1,
    borderColor: 'rgba(231, 106, 84, 0.2)',
    alignItems: 'center',
    zIndex: 1000,
  },
  prizeText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#213E4D',
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  footer: {
    width: '100%',
    alignItems: 'center',
    padding: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginTop: 'auto',
  },
  subheader: {
    fontSize: 18,
    color: '#213E4D',
    textAlign: 'center',
    marginBottom: 8,
    fontWeight: '600',
  },
  cta: {
    fontSize: 15,
    color: '#213E4D',
    textAlign: 'center',
    lineHeight: 22,
    opacity: 0.9,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: 25,
    borderRadius: 20,
    width: '90%',
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 15,
  },
  rulesHeader: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#213E4D',
    textAlign: 'center',
  },
  rulesText: {
    fontSize: 15,
    color: '#213E4D',
    lineHeight: 22,
    marginBottom: 20,
  },
  closeButton: {
    backgroundColor: '#E76A54',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 15,
    shadowColor: '#E76A54',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  closeButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
});
