module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
    plugins: [
      // If you have other plugins like 'react-native-paper/babel', put them here
      "react-native-reanimated/plugin", // ALWAYS LAST
    ],
  };
};