import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Globe, Lock } from "react-native-phosphor";
import { Colors, Radius, Space, Type } from "@/constants/style";

interface VisibilityToggleProps {
  value: "public" | "private";
  onChange: (value: "public" | "private") => void;
}

export function VisibilityToggle({ value, onChange }: VisibilityToggleProps) {
  return (
    <View style={styles.toggleRow}>
      <TouchableOpacity
        style={[styles.toggleBtn, value === "public" && styles.toggleBtnActive]}
        onPress={() => onChange("public")}
      >
        <Globe
          size={16}
          color={value === "public" ? Colors.white : Colors.textBody}
          weight="bold"
        />
        <Text
          style={[
            styles.toggleText,
            value === "public" && styles.toggleTextActive,
          ]}
        >
          Public
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.toggleBtn,
          value === "private" && styles.toggleBtnActive,
        ]}
        onPress={() => onChange("private")}
      >
        <Lock
          size={16}
          color={value === "private" ? Colors.white : Colors.textBody}
          weight="bold"
        />
        <Text
          style={[
            styles.toggleText,
            value === "private" && styles.toggleTextActive,
          ]}
        >
          Private
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  toggleRow: {
    flexDirection: "row",
    gap: Space.sm,
    marginBottom: Space.lg,
  },
  toggleBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: Space.sm,
    paddingHorizontal: Space.lg,
    borderRadius: Radius.pill,
    backgroundColor: Colors.surfaceMuted,
  },
  toggleBtnActive: {
    backgroundColor: Colors.activeChip,
  },
  toggleText: {
    fontSize: Type.sizeBodySm,
    fontWeight: Type.weightSemibold,
    color: Colors.textBody,
  },
  toggleTextActive: {
    color: Colors.white,
  },
});
