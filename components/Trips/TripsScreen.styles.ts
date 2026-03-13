import { StyleSheet } from 'react-native';
import { Colors, Type, Space, Radius, Shadows, S } from '@/constants/style';

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  content: { paddingHorizontal: Space.xxl, paddingTop: 60, paddingBottom: Space.xxxl },
  header: { ...S.display, marginBottom: 48 },
  timelineContainer: { alignItems: 'center', marginBottom: Space.xxxl },
  timelineLine: {
    position: 'absolute',
    left: 18, top: 18, bottom: 20,
    width: 1, backgroundColor: Colors.border,
  },
  timelineRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, width: '100%' },
  dotContainer: { width: 36, alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  dot: { width: 8, height: 8, borderRadius: 4, borderWidth: 1.5, backgroundColor: Colors.white },
  dotActive: { borderColor: Colors.textSecondary, backgroundColor: Colors.textSecondary },
  dotInactive: { borderColor: Colors.border, backgroundColor: Colors.border },
  card: {
    flexDirection: 'row', backgroundColor: Colors.white,
    borderRadius: 14, padding: 10, flex: 1, marginLeft: 6,
    alignItems: 'center', ...Shadows.level1,
  },
  cardImage: { width: 56, height: 56, borderRadius: Radius.lg, backgroundColor: Colors.surfacePale },
  cardContent: { flex: 1, paddingLeft: Space.md, justifyContent: 'center' },
  skeletonLine: { height: 8, backgroundColor: Colors.borderSubtle, borderRadius: Radius.xs, width: '85%' },
  ctaContainer: { alignItems: 'flex-start', },
  title: { fontSize: Type.sizeH2, fontWeight: Type.weightSemibold, color: Colors.textPrimary, marginBottom: Space.md, textAlign: 'left' },
  subtitle: { fontSize: Type.sizeTitle, color: Colors.textSecondary, textAlign: 'left', lineHeight: 24, },
  primaryButton: { backgroundColor: Colors.brand, paddingVertical: 14, paddingHorizontal: 32, borderRadius: Radius.md,  },
  buttonText: { color: Colors.white, fontSize: Type.sizeTitle, fontWeight: Type.weight700, textAlign: 'center' },
    pastTripsBanner: {
        flexDirection: 'row', 
        backgroundColor: Colors.surfacePale, 
        marginTop: Space.md, 
        borderWidth: 1, 
        borderColor: Colors.border, 
        borderRadius: Radius.card,
        bottom: Space.xxl,
        padding: Space.xxl, 
        alignItems: 'center', 
        justifyContent: 'space-between',
        margin: Space.xxl,
    },
    suitcaseIcon: {
    width: 40,
    height: 40,
    },
  bannerTextContent: { flexDirection: 'row', alignItems: 'center', gap: Space.sm, flex: 1 },
  bannerText: { fontSize: Type.sizeTitle, fontWeight: Type.weightMedium, color: Colors.textPrimary },
  luggageContainer: { marginLeft: 10 }
});