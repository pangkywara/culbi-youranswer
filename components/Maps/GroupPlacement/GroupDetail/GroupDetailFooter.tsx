import React from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { CheckCircle, Lock, UsersThree, WarningCircle } from "react-native-phosphor";
import { Colors, Type, Space, Radius, S } from "@/constants/style";

interface GroupDetailFooterProps {
  checkingMembership: boolean;
  alreadyIn: boolean;
  isOwner: boolean;
  canJoin: boolean;
  isFull: boolean;
  joining: boolean;
  joined: boolean;
  joinError: string | null;
  accentColor: string;
  onJoin: () => void;
  onOpenChat: () => void;
}

export function GroupDetailFooter({
  checkingMembership,
  alreadyIn,
  isOwner,
  canJoin,
  isFull,
  joining,
  joined,
  joinError,
  accentColor,
  onJoin,
  onOpenChat,
}: GroupDetailFooterProps) {
  return (
    <View style={styles.footer}>
      {/* Refined Error Message */}
      {joinError && (
        <View style={styles.errorContainer}>
          <WarningCircle size={14} color={Colors.destructive} weight="fill" />
          <Text style={styles.joinErrorText}>{joinError}</Text>
        </View>
      )}

      {checkingMembership ? (
        <View style={[styles.primaryBtn, { backgroundColor: Colors.surfaceMuted }]}>
          <ActivityIndicator size="small" color={Colors.textTertiary} />
        </View>
      ) : alreadyIn ? (
        <Pressable 
          style={({ pressed }) => [
            styles.primaryBtn, 
            { backgroundColor: accentColor },
            pressed && { opacity: 0.8 }
          ]} 
          onPress={onOpenChat}
        >
          <CheckCircle size={20} color={Colors.white} weight="fill" />
          <Text style={styles.btnText}>
            {isOwner ? "My Group — Open Chat" : "Open Chat"}
          </Text>
        </Pressable>
      ) : canJoin ? (
        <Pressable
          onPress={joining ? undefined : joined ? onOpenChat : onJoin}
          style={({ pressed }) => [
            styles.primaryBtn,
            { backgroundColor: joined ? "#1A7A4A" : Colors.brand },
            pressed && { opacity: 0.8 },
          ]}
        >
          {joining ? (
            <ActivityIndicator size="small" color={Colors.white} />
          ) : joined ? (
            <>
              <CheckCircle size={20} color={Colors.white} weight="fill" />
              <Text style={styles.btnText}>Joined! Open Chat →</Text>
            </>
          ) : (
            <>
              <UsersThree size={20} color={Colors.white} weight="fill" />
              <Text style={styles.btnText}>Join Group</Text>
            </>
          )}
        </Pressable>
      ) : isFull ? (
        <View style={styles.disabledBtn}>
          <Text style={styles.disabledBtnText}>Group is Full</Text>
        </View>
      ) : (
        <View style={styles.disabledBtn}>
          <Lock size={18} color={Colors.textTertiary} weight="fill" />
          <Text style={styles.disabledBtnText}>Private Group</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    paddingHorizontal: Space.xxl,
    paddingTop: Space.md,
    paddingBottom: Platform.OS === "ios" ? 44 : Space.xxl,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.borderSubtle,
    gap: Space.sm,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.surfaceSoft, // Use a light red if available
    paddingVertical: 6,
    borderRadius: Radius.md,
    marginBottom: 4,
  },
  joinErrorText: {
    fontSize: Type.sizeSmall,
    color: Colors.destructive,
    fontWeight: Type.weightSemibold,
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Space.sm,
    height: 56,
    borderRadius: Radius.card,
  },
  btnText: {
    fontSize: Type.sizeTitle,
    fontWeight: Type.weightBold,
    color: Colors.white,
    letterSpacing: -0.3,
  },
  disabledBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Space.sm,
    height: 56,
    borderRadius: Radius.card,
    backgroundColor: Colors.surfaceMuted,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  disabledBtnText: {
    fontSize: Type.sizeTitle,
    fontWeight: Type.weightBold,
    color: Colors.textTertiary,
  },
});