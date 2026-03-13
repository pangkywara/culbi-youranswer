import { Image } from "expo-image";
import React from "react";
import { View } from "react-native";
import { styles } from "./styles";

interface PhotoBannerProps {
  heroBannerUrl: string | null;
}

export function PhotoBanner({ heroBannerUrl }: PhotoBannerProps) {
  return (
    <View style={styles.photoWrapper}>
      {heroBannerUrl ? (
        <Image
          source={{ uri: heroBannerUrl }}
          style={styles.photo}
          contentFit="cover"
          cachePolicy="memory-disk"
        />
      ) : (
        <View style={[styles.photo, styles.photoFallback]} />
      )}
    </View>
  );
}
