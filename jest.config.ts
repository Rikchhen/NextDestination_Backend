module.exports = {
  coverageProvider: "v8",
  projects: [
    {
      displayName: "unit",
      preset: "ts-jest",
      testEnvironment: "node",
      roots: ["<rootDir>/src"],
      testMatch: ["**/__tests__/unit/**/*.test.ts"],
      setupFilesAfterEnv: ["<rootDir>/src/__tests__/setup.unit.ts"],
    },
    {
      displayName: "integration",
      preset: "ts-jest",
      testEnvironment: "node",
      roots: ["<rootDir>/src"],
      testMatch: ["**/__tests__/integration/**/*.test.ts"],
      setupFilesAfterEnv: ["<rootDir>/src/__tests__/setup.ts"],
      maxWorkers: 1,
    },
  ],
};
