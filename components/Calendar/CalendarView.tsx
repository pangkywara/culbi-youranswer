import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Calendar } from 'react-native-calendars';
import { Colors, Type, Space } from '@/constants/style';

interface CalendarViewProps {
  onDateChange: (range: string) => void;
  selectedDate?: string; // Expects "YYYY-MM-DD"
}

export const CalendarView = ({ onDateChange }: CalendarViewProps) => {
  const [range, setRange] = useState<{ start?: string; end?: string }>({});

  const onDayPress = (day: any) => {
    const dateString = day.dateString; // "YYYY-MM-DD"

    if (!range.start || (range.start && range.end)) {
      // Reset and start new range
      const newRange = { start: dateString, end: undefined };
      setRange(newRange);
      onDateChange(dateString);
    } else {
      // Complete the range
      if (dateString < range.start) {
        setRange({ start: dateString, end: undefined });
        onDateChange(dateString);
      } else {
        const newRange = { ...range, end: dateString };
        setRange(newRange);
        onDateChange(`${range.start}  →  ${dateString}`);
      }
    }
  };

  // Logic to color the dates between start and end
  const getMarkedDates = () => {
    let marked: any = {};
    if (range.start) {
      marked[range.start] = { startingDay: true, color: Colors.textPrimary, textColor: Colors.white };
    }
    if (range.end) {
      marked[range.end] = { endingDay: true, color: Colors.textPrimary, textColor: Colors.white };
      
      // Fill the middle (simplified logic for UI)
      let start = new Date(range.start!);
      let end = new Date(range.end);
      let current = new Date(start);
      current.setDate(current.getDate() + 1);

      while (current < end) {
        const str = current.toISOString().split('T')[0];
        marked[str] = { color: Colors.surfaceMuted, textColor: Colors.textPrimary };
        current.setDate(current.getDate() + 1);
      }
    }
    return marked;
  };

  return (
    <View style={styles.container}>
      <Calendar
        markingType={'period'}
        markedDates={getMarkedDates()}
        onDayPress={onDayPress}
        theme={{
          calendarBackground: Colors.white,
          textSectionTitleColor: Colors.textSecondary,
          dayTextColor: Colors.textPrimary,
          todayTextColor: Colors.textPrimary,
          selectedDayBackgroundColor: Colors.textPrimary,
          selectedDayTextColor: Colors.white,
          monthTextColor: Colors.textPrimary,
          textDayFontFamily: 'System',
          textMonthFontFamily: 'System',
          textDayHeaderFontFamily: 'System',
          textDayFontSize: 14,
          textMonthFontSize: 16,
          arrowColor: Colors.textPrimary,
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    marginTop: Space.sm,
  },
});