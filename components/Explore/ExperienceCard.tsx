import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Image } from 'expo-image';
import { Star } from "react-native-phosphor";
import { CulturalExperience } from "../../types";
import { Colors, Type, Space, Radius, Shadows } from "@/constants/style";
import AnimatedHeartButton from '@/components/AnimatedHeartButton';

interface ExperienceCardProps {
  experience: CulturalExperience;
  onPress: () => void;
  variant?: "compact" | "standard";
}

// React.memo — skips re-render when props are referentially equal.
export const ExperienceCard = React.memo(function ExperienceCard({
  experience,
  onPress,
  variant = "standard",
}: ExperienceCardProps) {
  const isCompact = variant === "compact";

  // imageUrl is already a fully-resolved URL built by useNearbyLandmarks
  // via buildPhotoUrl() — no further transformation needed here.
  const imageUrl = experience.imageUrl;

  return (
    <Pressable style={styles.card} onPress={onPress}>
      <View
        style={[
          styles.imageWrapper,
          isCompact ? styles.compactImage : styles.standardImage,
        ]}
      >
        <Image
          source={{ uri: imageUrl }}
          style={styles.cardImage}
          contentFit="cover"
          transition={200}
          cachePolicy="memory-disk"
          placeholder={{ blurhash: 'L6PZfSi_.AyE_3t7t7R**0o#DgR4' }}
        />

        {!isCompact && experience.bridgeRating >= 4.8 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>Guest favorite</Text>
          </View>
        )}

        <AnimatedHeartButton
          placeId={experience.id}
          placeName={experience.title}
          size={18}
          showBg={false}
          style={styles.heartButton}
        />
      </View>

      <View style={styles.cardContent}>
        <View style={styles.titleRow}>
          <Text
            style={[styles.cardTitle, isCompact && styles.compactText]}
            numberOfLines={1}
          >
            {experience.title}
          </Text>

          {experience.bridgeRating > 0 && (
            <View style={styles.ratingInline}>
              <Star size={12} color="#000" weight="fill" />
              <Text style={styles.ratingValue}>
                {experience.bridgeRating % 1 === 0
                  ? experience.bridgeRating.toFixed(1)
                  : experience.bridgeRating.toFixed(2)}
              </Text>
            </View>
          )}
        </View>

        <Text style={[styles.cardSubtitle, isCompact && styles.compactText]}>
          {isCompact
            ? experience.distance.split(",")[0]
            : experience.distance}
        </Text>
      </View>
    </Pressable>
  );
});

// STYLES REMAIN UNCHANGED TO PRESERVE UI/UX
const styles = StyleSheet.create({
  card: { width: "100%" },
  imageWrapper: {
    width: "100%",
    borderRadius: 30,
    overflow: "hidden",
    backgroundColor: Colors.surfacePale,
    position: "relative",
    ...Shadows.level5,
  },
  standardImage: { aspectRatio: 1 },
  compactImage: { aspectRatio: 1 },
  cardImage: { width: "100%", height: "100%" },
  heartButton: {
    position: "absolute",
    top: Space.md,
    right: Space.md,
    width: 34,
    height: 34,
    borderRadius: Radius.full,
    backgroundColor: Colors.imageOverlay,
    justifyContent: "center",
    alignItems: "center",
  },
  badge: {
    position: "absolute",
    top: Space.md,
    left: Space.md,
    backgroundColor: Colors.white,
    paddingHorizontal: Space.md,
    paddingVertical: Space.sm,
    borderRadius: Radius.full,
  },
  badgeText: {
    fontSize: Type.sizeSmall,
    fontWeight: Type.weightSemibold,
    color: "#000",
  },
  cardContent: { marginTop: Space.md },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  cardTitle: {
    fontSize: Type.sizeBody,
    fontWeight: Type.weightSemibold,
    color: Colors.textPrimary,
    flex: 1,
    marginRight: Space.sm,
  },
  compactText: { fontSize: Type.sizeCaption },
  cardSubtitle: {
    fontSize: Type.sizeBodySm,
    color: Colors.textSecondary,
    marginTop: Space.xxs,
  },
  ratingInline: { flexDirection: "row", alignItems: "center", gap: 2 },
  ratingValue: {
    fontSize: Type.sizeCaption,
    fontWeight: Type.weightMedium,
    color: "#000",
  },
});