import { StyleSheet } from 'react-native';
import { Colors, Type, Space, Radius, Shadows, S } from '@/constants/style';

export const styles = StyleSheet.create({
  // ─── Screen & List ──────────────────────────────────────────────────────────
  container: S.screen,
  listContent: { 
    paddingBottom: Space.xxxl * 2, // Extra room for bottom tabs
  },
  headerContainer: {
    paddingHorizontal: Space.xxl,
    paddingTop: 60, // Matches Bridge/Profile alignment
    paddingBottom: Space.lg,
  },

  // ─── Header Section ────────────────────────────────────────────────────────
  titleRow: {
    ...S.rowBetween,
    marginBottom: Space.xxl,
  },
  mainTitle: S.display,
  iconButton: {
    ...S.btnIconBordered, // Uses the white bordered circle style from style.ts
    borderColor: Colors.borderSubtle,
  },

  // ─── Stats Card (Spacious & Clean) ─────────────────────────────────────────
statsCard: {
    ...S.card,
    flexDirection: 'row',
    alignItems: 'stretch',   // Lets divider stretch full height of the card
    paddingVertical: Space.xl,
    paddingHorizontal: 0,    // Blocks fill full width
    backgroundColor: Colors.white,
    marginBottom: Space.xxl,
    ...Shadows.level1,
  },
  statItem: { 
    flex: 1,                 // Forces each block to be exactly 50% width
    flexDirection: 'row',
    alignItems: 'center',    // Vertically centre icon + text within the stretched row
    justifyContent: 'center',// Horizontally centre the icon/text group
    paddingHorizontal: Space.md,
    gap: Space.md,
  },
  statTextContainer: {
    flexShrink: 1,          // Allows it to shrink for truncation, but doesn't "push" layout
    justifyContent: 'center',
  },
  statIconCircle: {
    width: 44,
    height: 44,
    borderRadius: Radius.lg,
    ...S.center,
  },
  statValue: { 
    ...S.h2, 
    fontSize: 18,
    lineHeight: 22,
  },
  statLabel: { 
    ...S.label, 
    color: Colors.textSecondary,
    marginTop: 2,
  },
statDivider: {
    width: 1,
    // No fixed height — alignItems: 'stretch' on statsCard makes it fill the full card height
    backgroundColor: Colors.borderSubtle,
  },

  // ─── Categories ────────────────────────────────────────────────────────────
  categoriesScroll: S.pillRow,
  categoryPill: {
    ...S.pill,
    borderColor: Colors.borderSubtle,
  },
  activePill: S.pillActive,
  categoryText: S.pillText,
  activeCategoryText: S.pillTextActive,

  // ─── Mission Items ─────────────────────────────────────────────────────────
missionItem: {
    flexDirection: 'row',
    paddingHorizontal: Space.xxl,
    paddingVertical: Space.sm,
    alignItems: 'flex-start', 
  },
iconWrapper: { 
    marginRight: Space.lg,
    paddingTop: 2, 
  },
  iconContainer: {
    ...S.avatarSm, // Consistent circle size (52pt)
    ...S.center,
    backgroundColor: Colors.surfaceMuted,
  },
  completedIcon: { 
    backgroundColor: Colors.textPrimary 
  },
  checkBadge: {
    ...S.avatarBadge, // Reusing the profile checkmark badge logic
    padding: Space.xxs,
    backgroundColor: Colors.textPrimary,
  },
contentContainer: {
    flex: 1,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderSubtle,
    paddingBottom: Space.lg,
  },
textHeader: {
    ...S.rowBetween,
    alignItems: 'center', 
    marginBottom: 2,
    minHeight: 24, 
  },
  itemTitle: {
    ...S.titleSemi,
    flex: 1,
    marginRight: Space.sm,
  },
  completedText: { 
    color: Colors.textDisabled, 
    textDecorationLine: 'line-through' 
  },
  progressText: { 
    ...S.body,
    fontSize: Type.sizeCaption,
    color: Colors.textPrimary,
  },
  progressTextOngoing: {
    ...S.body,
    fontSize: Type.sizeCaption,
    color: Colors.brand,
    fontWeight: Type.weightSemibold as any,
  },
  progressTextCompleted: {
    ...S.body,
    fontSize: Type.sizeCaption,
    color: Colors.textSecondary,
  },
  description: { 
    ...S.subtitle, // 14pt secondary text
    marginBottom: Space.xs,
  },
  rewardRow: { 
    ...S.row,
    gap: Space.xs,
  },
  rewardText: { 
    ...S.labelBold,
    color: Colors.textPrimary,
  },
});