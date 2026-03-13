import { View, Text, StyleSheet } from 'react-native';
import { Colors, Type, Space } from '@/constants/style';

export const StatItem = ({ label, value }: { label: string; value: string | number }) => (
  <View style={styles.container}>
    <Text style={styles.value}>{value}</Text>
    <Text style={styles.label}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    paddingVertical: Space.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  value: {
    fontSize: Type.sizeH3,
    fontWeight: Type.weightBold,
    color: Colors.textPrimary,
  },
  label: {
    fontSize: Type.sizeCaption,
    color: Colors.textSecondary,
  },
});