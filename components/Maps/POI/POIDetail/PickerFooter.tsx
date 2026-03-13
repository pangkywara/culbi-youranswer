import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Colors } from "@/constants/style";

interface PickerFooterProps {
  added: boolean;
  onAdd: () => void;
}

export function PickerFooter({ added, onAdd }: PickerFooterProps) {
  return (
    <View style={styles.pickerFooter}>
      <TouchableOpacity activeOpacity={0.85} onPress={onAdd}>
        <LinearGradient
          colors={
            added ? [Colors.brand, Colors.brand] : [Colors.brand, Colors.brandSoft]
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.addBtn, added && styles.addBtnDone]}
        >
          <Text style={styles.addBtnText}>
            {added ? "Added ✓" : "Add to Itinerary"}
          </Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  pickerFooter: {
    paddingHorizontal: 24,
    paddingBottom: Platform.OS === "ios" ? 44 : 24,
    paddingTop: 12,
    backgroundColor: "#ffffff",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#E5E5E5",
  },
  addBtn: {
    backgroundColor: "#111111",
    borderRadius: 14,
    paddingVertical: 17,
    alignItems: "center",
  },
  addBtnDone: {
    backgroundColor: "#1A7A4A",
  },
  addBtnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
});
