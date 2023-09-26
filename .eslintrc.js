module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:react-hooks/recommended",
    "plugin:prettier/recommended",
  ],
  ignorePatterns: [".eslintrc.js", "package-scripts.js"],
  parser: "@typescript-eslint/parser",
  plugins: ["react-refresh", "prettier"],
  rules: {
    "prettier/prettier": "error",
  },
};
