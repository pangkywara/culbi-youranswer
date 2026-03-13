import { StyleSheet, Platform } from 'react-native';
import { Colors, Type, Space, Radius, Shadows } from '@/constants/style';

export const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: Platform.OS === 'android' ? 40 : 12, backgroundColor: Colors.white },
  header: { paddingHorizontal: Space.xxl, paddingBottom: Space.lg },
  backButton: { width: 40, height: 40, borderRadius: Radius.full, backgroundColor: Colors.surfaceMuted, justifyContent: 'center', alignItems: 'center', marginTop: Space.sm, marginBottom: Space.lg },
  title: { fontSize: Type.sizeDisplay, fontWeight: Type.weightBold, color: Colors.textPrimary, letterSpacing: -0.5 },
  subtitle: { fontSize: Type.sizeBodySm, color: Colors.textSecondary, marginTop: 4 },
  tabBar: { flexDirection: 'row', marginHorizontal: Space.xxl, backgroundColor: Colors.surfaceMuted, borderRadius: Radius.card, padding: 3, marginBottom: Space.lg },
  tab: { flex: 1, paddingVertical: Space.sm, alignItems: 'center', borderRadius: Radius.lg },
  tabActive: { backgroundColor: Colors.white, ...Shadows.level1 },
  tabLabel: { fontSize: Type.sizeBodySm, fontWeight: Type.weightSemibold, color: Colors.textTertiary },
  tabLabelActive: { color: Colors.textPrimary },
  scrollContent: { paddingHorizontal: Space.xxl, paddingTop: Space.xxl },
  empty: { paddingTop: Space.xxxl + Space.xxl, alignItems: 'center', gap: Space.sm },
  emptyTitle: { fontSize: Type.sizeTitle, fontWeight: Type.weightBold, color: Colors.textPrimary },
  emptyBody: { fontSize: Type.sizeBodySm, color: Colors.textSecondary, textAlign: 'center', paddingHorizontal: Space.xxxl },
  fabContainer: { position: 'absolute', bottom: Platform.OS === 'ios' ? 36 : 24, left: 0, right: 0, alignItems: 'center' },
  fab: { flexDirection: 'row', alignItems: 'center', gap: Space.sm, backgroundColor: Colors.brand, paddingHorizontal: Space.xxl, paddingVertical: Space.md + 2, borderRadius: Radius.full, ...Shadows.level4 },
  fabLabel: { fontSize: Type.sizeBodySm, fontWeight: Type.weight700, color: Colors.white },
});

export const modalStyles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: { backgroundColor: Colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: Space.xxl, paddingBottom: Platform.OS === 'ios' ? 40 : Space.xxl, gap: Space.lg },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.borderSubtle, alignSelf: 'center', marginBottom: Space.sm },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: Type.sizeTitle, fontWeight: Type.weightBold, color: Colors.textPrimary },
  fieldGroup: { gap: 6 },
  fieldLabel: { fontSize: Type.sizeBodySm, fontWeight: Type.weightSemibold, color: Colors.textSecondary },
  input: { borderWidth: 1.5, borderColor: Colors.borderSubtle, borderRadius: Radius.lg, paddingHorizontal: Space.lg, paddingVertical: Space.md, fontSize: Type.sizeBody, color: Colors.textPrimary, backgroundColor: Colors.surfaceMuted },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Space.sm, backgroundColor: Colors.brand, paddingVertical: Space.md + 4, borderRadius: Radius.full, marginTop: Space.sm },
  addBtnDisabled: { opacity: 0.4 },
  addBtnText: { fontSize: Type.sizeBody, fontWeight: Type.weight700, color: Colors.white },
});

export const bubbleStyles = StyleSheet.create({
  bubble: { position: 'absolute', alignItems: 'center' },
  inner: { alignItems: 'center', gap: 6 },
  iconCircle: { width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.white, justifyContent: 'center', alignItems: 'center', ...Shadows.level3 },
  label: { fontSize: 11, fontWeight: Type.weightSemibold, color: Colors.textPrimary, backgroundColor: Colors.white, paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.sm, overflow: 'hidden', ...Shadows.level1 },
});