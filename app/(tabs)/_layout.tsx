import React, { memo } from 'react';
import { Tabs } from 'expo-router';
import { Platform, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { ChatCircleDots, UserCircle, IconProps, GlobeHemisphereEast, Island, Binoculars } from 'react-native-phosphor';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

// Import our centralized styles
import { Colors, Type, Radius } from '@/constants/style';

interface TabBarIconProps {
  IconComponent: React.ElementType<IconProps>;
  color: string;
  focused: boolean;
}

const TabBarIcon = memo(({ IconComponent, color, focused }: TabBarIconProps) => (
  <IconComponent size={28} color={color} weight={focused ? 'fill' : 'regular'} />
));
TabBarIcon.displayName = 'TabBarIcon';

export const TAB_BAR_STYLE = StyleSheet.create({
  bar: {
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.borderSubtle,
    elevation: 0,
    shadowColor: 'transparent',
    shadowOpacity: 0,
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 0,
    paddingHorizontal: 12,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
    position: 'absolute',
    paddingTop: 8,
    height: 80,
    display: 'flex',
  },
  label: {
    fontSize: Type.sizeMicro + 2, // Matches 10px approx
    fontWeight: Type.weightMedium,
  },
});

export default function TabLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="dark" translucent backgroundColor="transparent" />
      <Tabs
        screenOptions={{
          lazy: true,
          freezeOnBlur: true,
          // Updated to use the new Brand Blue
          tabBarActiveTintColor: Colors.brand, 
          tabBarInactiveTintColor: Colors.textSecondary,
          tabBarStyle: TAB_BAR_STYLE.bar,
          tabBarLabelStyle: TAB_BAR_STYLE.label,
          headerShown: false,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Explore',
            tabBarIcon: ({ color, focused }) => (
              <TabBarIcon IconComponent={Binoculars} color={color} focused={focused} />
            ),
          }}
        />
        <Tabs.Screen
          name="missions"
          options={{
            title: 'Missions',
            tabBarIcon: ({ color, focused }) => (
              <TabBarIcon IconComponent={GlobeHemisphereEast} color={color} focused={focused} />
            ),
          }}
        />
        <Tabs.Screen
          name="trips"
          options={{
            title: 'Trips',
            tabBarIcon: ({ color, focused }) => (
              <TabBarIcon IconComponent={Island} color={color} focused={focused} />
            ),
          }}
        />
        <Tabs.Screen
          name="bridge"
          options={{
            title: 'Messages',
            tabBarIcon: ({ color, focused }) => (
              <TabBarIcon IconComponent={ChatCircleDots} color={color} focused={focused} />
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color, focused }) => (
              <TabBarIcon IconComponent={UserCircle} color={color} focused={focused} />
            ),
          }}
        />

      </Tabs>
    </GestureHandlerRootView>
  );
}