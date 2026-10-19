module.exports = function (api) {
  api.cache(true);
  return {
    // NativeWind's JSX transform (jsxImportSource: 'nativewind' + 'nativewind/babel')
    // is off: no component uses `className`, and its Pressable wrapper dropped
    // `style={({ pressed }) => ...}` styles app-wide (chips, buttons, the map
    // gym sheet). Re-enabling it means checking every Pressable style function.
    presets: ['babel-preset-expo'],
  };
};
