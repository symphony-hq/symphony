import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

export default defineConfig({
  plugins: [react()],
  root: "./symphony/client",
  publicDir: "./symphony/client/public",
  css: {
    preprocessorOptions: {
      scss: {
        quietDeps: true,
      },
    },
  },
  clearScreen: false,
});
