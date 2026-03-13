import { View, Text, StyleSheet } from 'react-native';

export interface TitleSectionProps {
  name?:         string;
  vicinity?:     string;
  rating?:       number;
  reviewCount?:  number;
  category?:     string;
  region?:       string;
}

export default function TitleSection({
  name        = 'Cultural Destination',
  vicinity    = '',
  rating,
  reviewCount,
  category,
  region,
}: TitleSectionProps) {
  const locationLine = [category, region ?? vicinity].filter(Boolean).join(' · ');

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{name}</Text>
      {locationLine ? <Text style={styles.sub}>{locationLine}</Text> : null}
      {vicinity && region ? <Text style={styles.details}>{vicinity}</Text> : null}
      {rating != null ? (
        <Text style={styles.rating}>
          ★ {rating.toFixed(2)}
          {reviewCount != null ? (
            <Text> · <Text style={styles.link}>{reviewCount} reviews</Text></Text>
          ) : null}
        </Text>
      ) : null}
      <View style={styles.divider} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: 24, },
  title: { fontSize: 24, fontWeight: '600', color: '#222', textAlign: 'center' },
  sub: { fontSize: 15, color: '#222', marginTop: 12, textAlign: 'center' },
  details: { fontSize: 15, color: '#717171', marginTop: 4, textAlign: 'center' },
  rating: { fontSize: 14, fontWeight: '600', marginTop: 12, textAlign: 'center' },
  link: { textDecorationLine: 'underline' },
  divider: { height: 1, backgroundColor: '#ebebeb', marginVertical: 24 }
});