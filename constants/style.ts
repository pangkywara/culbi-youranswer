/**
 * style.ts — Centralised design tokens + shared component style
 * * Usage:
 * import { Colors, Type, Space, Radius, Shadows, S } from '@/constants/style';
 */

import { Platform, StyleSheet } from 'react-native';

// ─── COLOUR PALETTE ──────────────────────────────────────────────────────────

export const Colors = {
  // ── Neutrals ──
  /** Pure white */
  white: '#FFFFFF',
  /** Near-white base surface (Bridge screens) */
  surfaceBase: '#FEFEFE',
  /** Faint surface — card backgrounds, stat boxes */
  surfaceSoft: '#FAFAFA',
  /** Light grey — icon circles, image placeholders, skeletons */
  surfaceMuted: '#F7F7F7',
  /** Very pale grey — skeleton lines */
  surfacePale: '#F2F2F2',

  /** Hairline border — subtle card outlines */
  borderSubtle: '#F0F0F0',
  /** Standard border */
  border: '#EBEBEB',
  /** Warm border (Bridge/messages) */
  borderWarm: '#E6DECC',

  /** Raised surface (hover / pressed press) */
  surfaceRaised: '#EEEBE4',
  /** Overlay surface */
  surfaceOverlay: '#D5D3D1',

  // ── Text ──
  /** Primary text — headings, bold labels (Charcoal) */
  textPrimary: '#222222',
  /** Display / stat numbers */
  textDisplay: '#111111',
  /** Body / icon text (Dark Gray) */
  textBody: '#484848',
  /** Warm body text (Bridge) */
  textBodyWarm: '#5C5955',
  /** Secondary / muted text — subtitles, meta */
  textSecondary: '#717171',
  /** Tertiary / placeholder — carets, timestamps */
  textTertiary: '#8F8F8F',
  /** Disabled / faint */
  textDisabled: '#8A8A8A',

  // ── Brand (Aero Blue Update) ──
  /** Primary brand blue — Softer, sophisticated blue for CTA and active states */
  brand: '#4176ED',
  /** Soft sky accent — secondary badges and subtle highlights */
  brandSoft: '#0047AB',
  /** Standard destructive red — for errors/delete */
  destructive: '#FF5A5F',

  // ── UI chrome on dark ──
  /** Dark pill / bubble sender background */
  dark: '#484848',
  /** High-contrast active pill */
  activeChip: '#222222',
  /** Badge fill (NEW badge) */
  badgeDark: '#484848',
  /** Badge fill — alternate (Using the soft sky blue) */
  badgeAlt: '#D9E6FF',

  // ── Semantic overlays ──
  /** Semi-transparent dark overlay on images */
  imageOverlay: 'rgba(0,0,0,0.25)',
  /** Footer overlay on holographic cards */
  cardFooterOverlay: 'rgba(0,0,0,0.60)',
} as const;

// ─── TYPOGRAPHY ──────────────────────────────────────────────────────────────

export const Type = {
  sizeDisplay:   32,
  sizeH1:        28,
  sizeH2:        22,
  sizeH3:        18,
  sizeTitle:     16,
  sizeBody:      15,
  sizeBodySm:    14,
  sizeCaption:   13,
  sizeSmall:     12,
  sizeMicro:      8,

  weightBlack:   '900' as const,
  weightBold:    '800' as const,
  weight700:     '700' as const,
  weightSemibold:'600' as const,
  weightMedium:  '500' as const,
  weightNormal:  '400' as const,

  lineHeight:    1.4,
  letterSpacing: 0.5,
} as const;

// ─── SPACING SCALE ───────────────────────────────────────────────────────────

export const Space = {
  xxs:  2,
  xs:   4,
  sm:   8,
  md:  12,
  lg:  16,
  xl:  20,
  xxl: 24,
  xxxl:40,
} as const;

// ─── BORDER RADIUS SCALE ─────────────────────────────────────────────────────

export const Radius = {
  xs:    4,
  sm:    6,
  md:    8,
  lg:   12,
  card: 16,
  xl:   20,
  cardLg: 24,
  pill: 40,
  full: 999,
} as const;

// ─── SHADOW PRESETS ──────────────────────────────────────────────────────────

export const Shadows = {
  level1: Platform.select({
    ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8 },
    android: { elevation: 1 },
  }),
  level2: Platform.select({
    ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12 },
    android: { elevation: 2 },
  }),
  level3: Platform.select({
    ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.10, shadowRadius: 12 },
    android: { elevation: 4 },
  }),
  level4: Platform.select({
    ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.10, shadowRadius: 10 },
    android: { elevation: 4 },
  }),
  level5: Platform.select({
    ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 10 },
    android: { elevation: 5 },
  }),
} as const;

// ─── SHARED COMPONENT STYLES ─────────────────────────────────────────────────

export const S = StyleSheet.create({

  // ── Screen layout ─────────────────────────────────────────────────────────

  screen: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  screenPadding: {
    paddingHorizontal: Space.xl,
  },
  screenContent: {
    paddingHorizontal: Space.xl,
    paddingTop: Space.xl,
    paddingBottom: Space.xxxl,
  },

  // ── Typography ────────────────────────────────────────────────────────────

  display: {
    fontSize: Type.sizeDisplay,
    fontWeight: Type.weight700,
    color: Colors.textPrimary,
  },
  h1: {
    fontSize: Type.sizeH1,
    fontWeight: Type.weight700,
    color: Colors.textPrimary,
  },
  h2: {
    fontSize: Type.sizeH2,
    fontWeight: Type.weightBold,
    color: Colors.textDisplay,
    letterSpacing: Type.letterSpacing,
  },
  h3: {
    fontSize: Type.sizeH3,
    fontWeight: Type.weight700,
    color: Colors.textPrimary,
  },
  title: {
    fontSize: Type.sizeTitle,
    fontWeight: Type.weight700,
    color: Colors.textPrimary,
  },
  titleSemi: {
    fontSize: Type.sizeTitle,
    fontWeight: Type.weightSemibold,
    color: Colors.textPrimary,
  },
  body: {
    fontSize: Type.sizeBody,
    fontWeight: Type.weightMedium,
    color: Colors.textPrimary,
  },
  bodyBase: {
    fontSize: Type.sizeBodySm,
    color: Colors.textPrimary,
  },
  subtitle: {
    fontSize: Type.sizeBodySm,
    color: Colors.textSecondary,
    marginTop: Space.xs,
  },
  caption: {
    fontSize: Type.sizeCaption,
    fontWeight: Type.weightMedium,
    color: Colors.textSecondary,
  },
  label: {
    fontSize: Type.sizeSmall,
    fontWeight: Type.weightMedium,
    color: Colors.textDisabled,
    marginTop: Space.xxs,
  },
  labelBold: {
    fontSize: Type.sizeSmall,
    fontWeight: Type.weightSemibold,
    color: Colors.textPrimary,
  },
  micro: {
    fontSize: Type.sizeMicro,
    fontWeight: Type.weightBold,
    color: Colors.white,
  },

  // ── Cards ─────────────────────────────────────────────────────────────────

  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.card,
    padding: Space.lg,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    ...Shadows.level1,
  },
  cardLg: {
    backgroundColor: Colors.white,
    borderRadius: Radius.cardLg,
    padding: Space.xxl,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    ...Shadows.level2,
  },
  cardImagePlaceholder: {
    width: '100%',
    height: 90,
    borderRadius: Radius.lg,
    marginBottom: Space.sm,
  },

  // ── Buttons ───────────────────────────────────────────────────────────────

  btnPrimary: {
    backgroundColor: Colors.brand,
    paddingVertical: 14,
    paddingHorizontal: Space.xxl,
    borderRadius: Radius.lg,
    alignItems: 'center',
  },
  btnPrimaryText: {
    color: Colors.white,
    fontSize: Type.sizeTitle,
    fontWeight: Type.weightSemibold,
  },
  btnSecondary: {
    backgroundColor: Colors.surfaceMuted,
    paddingVertical: 14,
    paddingHorizontal: Space.xxl,
    borderRadius: Radius.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  btnSecondaryText: {
    color: Colors.textPrimary,
    fontSize: Type.sizeTitle,
    fontWeight: Type.weightSemibold,
  },
  btnIcon: {
    width: 40,
    height: 40,
    borderRadius: Radius.xl,
    backgroundColor: Colors.surfaceMuted,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnIconBordered: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },

  // ── Pills / Tabs ──────────────────────────────────────────────────────────

  pillRow: {
    flexDirection: 'row',
    marginBottom: Space.xl,
  },
  pill: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: Radius.pill,
    backgroundColor: Colors.surfaceMuted,
    marginRight: Space.sm,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pillActive: {
    backgroundColor: Colors.activeChip,
    borderColor: Colors.activeChip,
  },
  pillText: {
    fontSize: Type.sizeBodySm,
    fontWeight: Type.weightSemibold,
    color: Colors.textPrimary,
  },
  pillTextActive: {
    color: Colors.white,
  },

  // ── Badges ────────────────────────────────────────────────────────────────

  badge: {
    paddingHorizontal: Space.sm,
    paddingVertical: Space.xxs,
    borderRadius: Radius.xs,
    backgroundColor: Colors.badgeDark,
  },
  badgeText: {
    fontSize: Type.sizeMicro,
    fontWeight: Type.weightBold,
    color: Colors.white,
  },
  badgeNew: {
    position: 'absolute',
    top: -8,
    right: -24,
    backgroundColor: Colors.badgeDark,
    paddingHorizontal: Space.xs,
    paddingVertical: 2,
    borderRadius: Radius.xs,
    borderWidth: 1,
    borderColor: Colors.white,
  },
  badgeNewCard: {
    position: 'absolute',
    top: Space.sm,
    right: Space.sm,
    backgroundColor: Colors.badgeDark,
    paddingHorizontal: Space.xs,
    borderRadius: Radius.xs,
    zIndex: 10,
  },

  // ── Dividers ──────────────────────────────────────────────────────────────

  divider: {
    height: 1,
    backgroundColor: Colors.borderSubtle,
  },
  dividerIndented: {
    height: 1,
    backgroundColor: Colors.borderSubtle,
    marginLeft: 40,
  },
  dividerSettings: {
    height: 2,
    backgroundColor: Colors.borderSubtle,
  },
  dividerVertical: {
    width: 1,
    backgroundColor: Colors.border,
    alignSelf: 'stretch',
  },

  // ── Lists / Settings rows ─────────────────────────────────────────────────

  listItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Space.xl,
  },
  listItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.lg,
  },
  listItemText: {
    fontSize: Type.sizeTitle,
    color: Colors.textPrimary,
  },

  // ── Stats ─────────────────────────────────────────────────────────────────

  statBox: {
    flex: 1,
    backgroundColor: Colors.surfaceSoft,
    paddingVertical: 14,
    borderRadius: Radius.card,
    alignItems: 'center',
    marginHorizontal: Space.xs,
  },
  statValue: {
    fontSize: Type.sizeH2,
    fontWeight: Type.weightBold,
    color: Colors.textDisplay,
    letterSpacing: Type.letterSpacing,
  },
  statLabel: {
    marginTop: Space.xxs,
    fontSize: Type.sizeSmall,
    color: Colors.textDisabled,
    fontWeight: Type.weightMedium,
  },
  statItem: {
    paddingVertical: Space.sm,
  },
  statNumber: {
    fontSize: Type.sizeH3,
    fontWeight: Type.weight700,
    color: Colors.textPrimary,
  },

  // ── Avatars ───────────────────────────────────────────────────────────────

  avatarLg: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.textPrimary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarLgText: {
    color: Colors.white,
    fontSize: 40,
    fontWeight: Type.weightBold,
  },
  avatarMd: {
    width: 64,
    height: 64,
    borderRadius: Radius.md,
    backgroundColor: Colors.borderSubtle,
  },
  avatarSm: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.surfaceRaised,
  },
  avatarBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: Colors.brand,
    padding: Space.xs,
    borderRadius: Radius.lg,
    borderWidth: 2,
    borderColor: Colors.white,
  },
  unreadDot: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.destructive,
    borderWidth: 1.5,
    borderColor: Colors.surfaceBase,
  },

  // ── Search bar ────────────────────────────────────────────────────────────

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Space.md,
    backgroundColor: Colors.white,
    paddingVertical: Space.xl,
    paddingHorizontal: Space.xl,
    borderRadius: Radius.pill,
    borderWidth: 0.5,
    borderColor: '#DDD',
    ...Shadows.level4,
  },
  searchBarText: {
    fontSize: Type.sizeBody,
    fontWeight: Type.weightMedium,
    color: Colors.textPrimary,
  },

  // ── Progress bar ──────────────────────────────────────────────────────────

  progressTrack: {
    height: 6,
    backgroundColor: Colors.borderSubtle,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: Space.sm,
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.brand,
  },

  // ── Active indicator line (category tabs) ─────────────────────────────────

  activeIndicatorLine: {
    height: 2,
    width: '100%',
    backgroundColor: Colors.textPrimary,
    marginTop: 10,
  },
  activeIndicatorThick: {
    height: 3,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    width: '100%',
    backgroundColor: Colors.textPrimary,
    marginTop: Space.sm,
  },

  // ── Chat / messages ───────────────────────────────────────────────────────

  bubbleUser: {
    padding: Space.md,
    borderRadius: 18,
    borderBottomRightRadius: Space.xs,
    backgroundColor: Colors.dark,
  },
  bubbleOther: {
    padding: Space.md,
    borderRadius: 18,
    borderBottomLeftRadius: Space.xs,
    backgroundColor: Colors.surfaceMuted,
  },
  bubbleTextUser: {
    color: Colors.white,
    fontSize: Type.sizeTitle,
  },
  bubbleTextOther: {
    color: Colors.textPrimary,
    fontSize: Type.sizeTitle,
  },

  // ── Layout helpers ────────────────────────────────────────────────────────

  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rowBetween: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  fill: {
    flex: 1,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  absoluteFill: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
  },

  // ── Screen header (back-button + large title) ─────────────────────────────

  screenHeaderContainer: {
    marginBottom: Space.xl,
    paddingTop: Space.xxxl,
  },
  screenHeaderBackBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    backgroundColor: Colors.surfaceMuted,
    borderRadius: Radius.xl,
    alignItems: 'center',
  },
  screenHeaderTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Space.md,
  },
});