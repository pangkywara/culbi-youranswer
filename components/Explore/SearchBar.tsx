import React from 'react'; // Removed internal useState
import { View, Text, Pressable, StyleSheet, Image } from 'react-native';
import Animated, {
  useAnimatedStyle,
  interpolate,
  Extrapolate,
  type SharedValue,
} from 'react-native-reanimated';
import { MagnifyingGlass } from 'react-native-phosphor';
import { Colors, Type, Space, Radius, S } from '@/constants/style';

// 1. Define the Category type
interface Category {
  id: string;
  label: string;
  source: any;
  isNew?: boolean;
}

// 2. Update the Props Interface to include shared state
interface SearchBarProps {
  topOffset: number;
  scrollY: SharedValue<number>;
  progress: SharedValue<number>;
  onPressSearch: () => void;
  activeId: string;                 // Added
  setActiveId: (id: string) => void; // Added
  categories: Category[];           // Added
}

export const SearchBar = ({
  topOffset,
  scrollY,
  progress,
  onPressSearch,
  activeId,     // Received from Parent
  setActiveId,  // Received from Parent
  categories,   // Received from Parent
}: SearchBarProps) => {

  const wrapperAnimated = useAnimatedStyle(() => {
    const borderOpacity = interpolate(scrollY.value, [0, 20], [0, 1], Extrapolate.CLAMP);
    const opacity = interpolate(progress.value, [0, 1], [1, 0]);

    return {
      borderBottomColor: `rgba(235,235,235,${borderOpacity})`,
      opacity,
      transform: [
        { scale: interpolate(progress.value, [0, 1], [1, 0.94]) },
        { translateY: interpolate(progress.value, [0, 1], [0, -40]) }
      ]
    };
  });

  const iconScaleStyle = useAnimatedStyle(() => {
    const scale = interpolate(scrollY.value, [0, 50], [1, 0], Extrapolate.CLAMP);
    return { transform: [{ scale }] };
  });

  const rowTranslateStyle = useAnimatedStyle(() => {
    const translateY = interpolate(scrollY.value, [0, 50], [0, -28], Extrapolate.CLAMP);
    return { transform: [{ translateY }] };
  });

  const bottomHeightStyle = useAnimatedStyle(() => {
    const height = interpolate(scrollY.value, [0, 50], [88, 37], Extrapolate.CLAMP);
    return { height };
  });

  const labelSpacingStyle = useAnimatedStyle(() => {
    const marginTop = interpolate(scrollY.value, [0, 50], [4, -18], Extrapolate.CLAMP);
    return { marginTop };
  });

  return (
    <Animated.View
      style={[
        styles.wrapper,
        wrapperAnimated,
        { paddingTop: topOffset + 10 },
      ]}
    >
      <View style={styles.searchContainer}>
        <Pressable style={S.searchBar} onPress={onPressSearch}>
          <MagnifyingGlass size={20} color={Colors.textPrimary} weight="bold" />
          <Text style={S.searchBarText}>Search for destinations</Text>
        </Pressable>
      </View>

      <Animated.View
        style={[
          { overflow: 'hidden', width: '100%', alignItems: 'center' },
          bottomHeightStyle,
        ]}
      >
        <Animated.View style={[styles.iconsContainer, rowTranslateStyle]}>
          {/* Use categories passed from parent */}
          {categories.map((item) => (
            <CategoryItem
              key={item.id}
              source={item.source}
              label={item.label}
              isNew={item.isNew}
              active={activeId === item.id} // Compare against shared state
              onPress={() => setActiveId(item.id)} // Update shared state
              iconScaleStyle={iconScaleStyle}
              labelSpacingStyle={labelSpacingStyle}
            />
          ))}
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
};

const CategoryItem = ({
  source,
  label,
  active,
  isNew,
  iconScaleStyle,
  labelSpacingStyle,
  onPress,
}: any) => (
  <Pressable onPress={onPress} style={styles.iconItem}>
    <Animated.View style={[styles.iconCircle, iconScaleStyle]}>
      <Image source={source} style={styles.categoryImage} />
      {isNew && (
        <View style={styles.newBadge}>
          <Text style={[S.micro, { color: 'white', fontSize: 8 }]}>NEW</Text>
        </View>
      )}
    </Animated.View>

    <Animated.Text
      style={[
        styles.iconLabel,
        active && styles.iconLabelActive,
        labelSpacingStyle,
      ]}
    >
      {label}
    </Animated.Text>

    {active && <View style={S.activeIndicatorThick} />}
  </Pressable>
);

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    backgroundColor: Colors.white,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(235,235,235,0)',
  },
  searchContainer: { width: '90%', marginBottom: Space.md },
  iconsContainer: {
    flexDirection: 'row',
    gap: 35,
    paddingBottom: 10,
    paddingTop: 0,
  },
  iconItem: { alignItems: 'center', minWidth: 70 },
  iconCircle: {
    width: 55,
    height: 55,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'visible',
  },
  categoryImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  iconLabel: {
    fontSize: Type.sizeCaption,
    color: Colors.textSecondary,
    marginTop: Space.xs,
    fontWeight: Type.weightMedium,
  },
  iconLabelActive: {
    color: Colors.textPrimary,
    fontWeight: Type.weightMedium,
  },
  newBadge: {
    position: 'absolute',
    top: 10,
    right: -15,
    backgroundColor: Colors.badgeDark,
    paddingHorizontal: Space.xs,
    borderRadius: Radius.xs,
    zIndex: 10,
  },
});