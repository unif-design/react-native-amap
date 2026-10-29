module.exports = {
  preset: '@unif/react-native-design/jest-preset',
  setupFilesAfterEnv: ['<rootDir>/__tests__/setup.ts'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native[a-z-]*|@react-native|@unif|@callstack)/)',
  ],
  roots: ['<rootDir>/src', '<rootDir>/__tests__'],
  testMatch: ['<rootDir>/__tests__/**/*.test.[jt]s?(x)'],
  moduleNameMapper: {
    '^react$': '<rootDir>/node_modules/react',
    '^react-native$': '<rootDir>/node_modules/react-native',
    '^react-native-(permissions|keyboard-controller|worklets|reanimated|safe-area-context|gesture-handler|svg)$':
      '<rootDir>/node_modules/react-native-$1',
    '^@amap/(.*)$': '<rootDir>/src/$1',
    '^@host/(.*)$': '<rootDir>/example/src/host/$1',
  },
  clearMocks: true,
  restoreMocks: true,
};
