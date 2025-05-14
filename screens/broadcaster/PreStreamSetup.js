import React from 'react';
import CustomHeader from '../../components/CustomHeader';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { usePreStreamSetup } from './prestream/usePreStreamSetup';
import { PreStreamForm } from './prestream/PreStreamForm';

export default function PreStreamSetup({ navigation }) {
  const handlers = usePreStreamSetup(navigation);
  return (
    <KeyboardAwareScrollView keyboardShouldPersistTaps="handled" extraScrollHeight={20}>
      <CustomHeader title="Show Setup" showBack={true} />
      <PreStreamForm {...handlers} />
    </KeyboardAwareScrollView>
  );
}
