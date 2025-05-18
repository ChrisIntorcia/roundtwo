import React from 'react';
import { View, StyleSheet } from 'react-native';
import CustomHeader from '../../components/CustomHeader';
import { usePreStreamSetup } from './prestream/usePreStreamSetup';
import { PreStreamForm } from './prestream/PreStreamForm';

export default function PreStreamSetup({ navigation }) {
  const handlers = usePreStreamSetup(navigation);
  
  return (
    <View style={styles.container}>
      <CustomHeader title="Show Setup" showBack={true} />
      <PreStreamForm {...handlers} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F9F9',
  },
});
