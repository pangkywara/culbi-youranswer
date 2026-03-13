import React, { useState } from 'react';
import { SafeAreaView, View, Text, StyleSheet } from 'react-native';
import { DateTabSwitch } from './DateTabSwitch';
import { CalendarView } from './CalendarView';
import { Colors, S, Space } from '@/constants/style';

const WhenPickerScreen = () => {
  const [activeTab, setActiveTab] = useState<'dates' | 'flexible'>('dates');
  const [selectedRange, setSelectedRange] = useState('');

  return (
    <SafeAreaView style={S.screen}>
      <View style={styles.header}>
        <Text style={[S.h1, styles.title]}>When?</Text>
      </View>

      <DateTabSwitch 
        activeTab={activeTab} 
        onTabChange={setActiveTab} 
      />

      <View style={S.fill}>
        {activeTab === 'dates' ? (
          <CalendarView onDateChange={(range) => setSelectedRange(range)} />
        ) : (
          <View style={[S.center, S.fill]}>
            <Text style={S.subtitle}>Flexible dates options here</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: Space.xl,
    paddingTop: Space.lg,
    paddingBottom: Space.md,
  },
  title: {
    marginBottom: Space.md,
  },
});

export default WhenPickerScreen;