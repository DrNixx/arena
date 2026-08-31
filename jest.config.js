module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  moduleFileExtensions: [
      "ts",
      "tsx",
      "js"
  ],
  moduleNameMapper: {
    // lodash-es - ESM-only сборка, а jest грузит node_modules без трансформа,
    // поэтому в тестах подменяем её на эквивалентную CJS-сборку lodash
    // (версии держим одинаковыми). date-fns подмены не требует: у неё есть
    // require-экспорт на index.cjs.
    "^lodash-es$": "lodash",
    "^lodash-es/(.*)$": "lodash/$1",
    "~(.*)$": "<rootDir>/src/$1"
  },
  testMatch: [
      "<rootDir>/src/**/__tests__/*.(ts|tsx|js)"
  ],
  transform: {
    "^.+\\.(j|t)sx?$": ["ts-jest", { tsconfig: "tsconfig.test.json" }]
  },
  verbose: true
};
