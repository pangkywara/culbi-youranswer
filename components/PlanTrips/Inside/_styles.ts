import { StyleSheet, Platform } from 'react-native';
import { Colors, Type, Space, Radius } from '@/constants/style';

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
    paddingTop: Platform.OS === 'android' ? 40 : 0,
  },

  // ── Navbar ────────────────────────────────────────────────────────────────
  navbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Space.xxl,
    paddingVertical: Space.lg,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.borderSubtle,
    marginTop: Platform.OS === 'android' ? 20 : 0,
    backgroundColor: Colors.white,
  },
  backBtn: {
    padding: Space.xs,
    marginRight: Space.sm,
  },
  navCenter: {
    flex: 1,
    alignItems: 'center',
  },
  navTitle: {
    fontSize: Type.sizeBodySm,
    fontWeight: Type.weightSemibold,
    color: Colors.textPrimary,
    letterSpacing: -0.1,
  },
  navAction: {
    padding: Space.xs,
    marginLeft: Space.sm,
  },
  navActionText: {
    fontSize: Type.sizeBodySm,
    fontWeight: Type.weightSemibold,
    color: Colors.textPrimary,
    textDecorationLine: 'underline',
  },
  navActionTextDone: {
    color: Colors.brand,
    textDecorationLine: 'none',
  },
  navDots: {
    padding: Space.xs,
    marginLeft: Space.sm,
  },

  // ── Scroll content ────────────────────────────────────────────────────────
  scrollContent: {
    paddingBottom: Space.xxxl * 2,
  },

  // ── Meta / Hero section ───────────────────────────────────────────────────
  metaSection: {
    paddingHorizontal: Space.xxl,
    paddingTop: Space.xxl + Space.lg,
    paddingBottom: Space.xxl,
    gap: Space.xs,
  },
  metaTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  statusLabel: {
    fontSize: Type.sizeSmall,
    fontWeight: Type.weightBold,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  statusLabelPlanned: { color: Colors.brand },
  statusLabelDone:    { color: Colors.textTertiary },
  dateLabel: {
    fontSize: Type.sizeCaption,
    color: Colors.textSecondary,
    fontWeight: Type.weightNormal,
  },
  tripTitle: {
    fontSize: 34,
    fontWeight: Type.weightBold,
    color: Colors.textPrimary,
    letterSpacing: -1,
    lineHeight: 40,
    marginTop: Space.xs,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    flexWrap: 'wrap',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    fontSize: Type.sizeBodySm,
    color: Colors.textSecondary,
    fontWeight: Type.weightNormal,
  },
  statDot: {
    fontSize: 14,
    color: Colors.border,
    marginHorizontal: 4,
  },

  // ── Itinerary section ─────────────────────────────────────────────────────
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: Space.xxl,
    paddingTop: Space.xxl + Space.md,
    paddingBottom: Space.xl,
  },
  sectionTitle: {
    fontSize: Type.sizeH2,
    fontWeight: Type.weightBold,
    color: Colors.textPrimary,
    letterSpacing: -0.3,
  },
  sectionMeta: {
    fontSize: Type.sizeBodySm,
    color: Colors.textSecondary,
  },
  editHint: {
    fontSize: Type.sizeCaption,
    color: Colors.textTertiary,
    fontStyle: 'italic',
  },
  timeline: {
    paddingHorizontal: Space.xxl,
  },

  // ── Add stop ──────────────────────────────────────────────────────────────
  addStopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.lg,
    paddingHorizontal: Space.xxl,
    paddingVertical: Space.xl,
    marginTop: Space.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.borderSubtle,
  },
  addIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: Colors.brand,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.white,
  },
  addLabel: {
    fontSize: Type.sizeBody,
    fontWeight: Type.weightSemibold,
    color: Colors.brand,
    textDecorationLine: 'underline',
  },
  addSub: {
    fontSize: Type.sizeCaption,
    color: Colors.textTertiary,
    marginTop: 2,
  },

  // ── Error states ──────────────────────────────────────────────────────────
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: Space.lg,
    padding: Space.xxl,
  },
  errorText: {
    fontSize: Type.sizeTitle,
    fontWeight: Type.weightMedium,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  backLinkText: {
    fontSize: Type.sizeBody,
    color: Colors.textPrimary,
    fontWeight: Type.weightSemibold,
    textDecorationLine: 'underline',
  },
});

// ── Modal Styles ─────────────────────────────────────────────────────────────

export const modalStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: Colors.imageOverlay,
  },
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: Radius.cardLg,
    borderTopRightRadius: Radius.cardLg,
    paddingHorizontal: Space.xxl,
    paddingTop: Space.md,
    paddingBottom: Platform.OS === 'ios' ? 44 : Space.xxl,
    gap: Space.xl,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.surfacePale,
    alignSelf: 'center',
    marginBottom: Space.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: Type.sizeH3,
    fontWeight: Type.weightBold,
    color: Colors.textPrimary,
  },
  fieldGroup: { gap: Space.sm },
  fieldLabel: {
    fontSize: Type.sizeBodySm,
    fontWeight: Type.weightSemibold,
    color: Colors.textPrimary,
  },
  input: {
    height: 52,
    backgroundColor: Colors.surfaceMuted,
    borderRadius: Radius.lg,
    paddingHorizontal: Space.lg,
    fontSize: Type.sizeBody,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Space.sm,
    backgroundColor: Colors.brand,
    paddingVertical: 16,
    borderRadius: Radius.card,
    marginTop: Space.xs,
  },
  addBtnDisabled: {
    backgroundColor: Colors.surfaceMuted,
    opacity: 0.6,
  },
  addBtnText: {
    fontSize: Type.sizeTitle,
    fontWeight: Type.weightBold,
    color: Colors.white,
  },
  dayGroup: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.borderSubtle,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Space.xxl,
    paddingVertical: Space.xl,
    backgroundColor: Colors.white,
  },
  dayTitle: {
    fontSize: 18,
    fontWeight: Type.weightBold,
    color: Colors.textPrimary,
  },
  stopNumber: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: Colors.dark,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Space.md,
  },
  stopNumberText: {
    color: Colors.white,
    fontSize: 13,
    fontWeight: Type.weightBold,
  },
});