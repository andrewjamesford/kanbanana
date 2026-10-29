import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

const root = path.resolve(import.meta.dirname, "../..");
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, root, "");
  return {
    plugins: [react()],
    envDir: root,
    server: {
      strictPort: true,
      proxy: {
        "/api": {
          target:
            process.env.API_PROXY_TARGET ??
            env.API_PROXY_TARGET ??
            "http://localhost:4100",
          changeOrigin: true,
        },
      },
    },
    resolve: { alias: { "@": path.resolve(import.meta.dirname, "./src") } },
  };
});
