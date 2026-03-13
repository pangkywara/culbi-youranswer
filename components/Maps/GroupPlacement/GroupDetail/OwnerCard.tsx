import { Image } from "expo-image";
import React from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { Colors, Type, Space, Radius, S } from "@/constants/style";

export interface OwnerProfile {
  id: string;
  displayName: string;
  avatarUrl: string | null;
  username: string | null;
}

interface OwnerCardProps {
  owner: OwnerProfile | null;
  isOwner: boolean;
  accentColor?: string; // Optional: Defaults to brand blue
}

export function OwnerCard({ owner, isOwner, accentColor = Colors.brand }: OwnerCardProps) {
  return (
    <View style={styles.ownerCard}>
      {owner ? (
        <>
          {/* Avatar Treatment */}
          <View style={styles.avatarWrapper}>
            {owner.avatarUrl ? (
              <Image
                source={{ uri: owner.avatarUrl }}
                style={styles.ownerAvatarImg}
                contentFit="cover"
                cachePolicy="memory-disk"
                transition={200}
              />
            ) : (
              <View style={[styles.ownerAvatarFallback, { backgroundColor: accentColor }]}>
                <Text style={styles.ownerAvatarInitial}>
                  {owner.displayName.charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
          </View>

          {/* Info Section */}
          <View style={styles.ownerInfo}>
            <Text style={styles.ownerName}>{owner.displayName}</Text>
            {owner.username && (
              <Text style={styles.ownerUsername}>@{owner.username.toLowerCase()}</Text>
            )}
          </View>

          {/* "You" Badge — Clean pill style */}
          {isOwner && (
            <View style={styles.youBadge}>
              <Text style={styles.youBadgeText}>You</Text>
            </View>
          )}
        </>
      ) : (
        <View style={S.center}>
           <ActivityIndicator size="small" color={Colors.textTertiary} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  ownerCard: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: Space.xxl,
    paddingVertical: Space.lg,
    paddingHorizontal: Space.lg,
    backgroundColor: Colors.white,
    borderRadius: Radius.card,
    borderWidth: 1,
    borderColor: Colors.borderSubtle,
    gap: Space.md,
  },
  avatarWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surfaceMuted,
    overflow: "hidden",
  },
  ownerAvatarImg: {
    width: 44,
    height: 44,
  },
  ownerAvatarFallback: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  ownerAvatarInitial: {
    fontSize: Type.sizeTitle,
    fontWeight: Type.weightBold,
    color: Colors.white,
  },
  ownerInfo: { 
    flex: 1,
    justifyContent: 'center',
  },
  ownerName: {
    fontSize: Type.sizeBody,
    fontWeight: Type.weightBold,
    color: Colors.textPrimary,
    letterSpacing: -0.2,
  },
  ownerUsername: {
    fontSize: Type.sizeCaption,
    color: Colors.textSecondary,
    fontWeight: Type.weightMedium,
    marginTop: 1,
  },
  youBadge: {
    backgroundColor: Colors.badgeAlt, // The soft sky blue
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radius.pill,
  },
  youBadgeText: {
    fontSize: Type.sizeSmall,
    fontWeight: Type.weightBold,
    color: Colors.brand,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
});