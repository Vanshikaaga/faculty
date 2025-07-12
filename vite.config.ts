import { defineConfig, type PluginOption } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(async ({ mode }) => {
  const plugins: PluginOption[] = [react()];

  if (mode === "development") {
    // Dynamically import lovable-tagger to avoid ESM error in production
    const { componentTagger } = await import("lovable-tagger");
    plugins.push(componentTagger());
  }

  return {
    server: {
      host: "::",
      port: 8080,
      proxy: {
        "/predict": {
          target: "http://localhost:5000",
          changeOrigin: true,
        },
        "/model-info": {
          target: "http://localhost:5000",
          changeOrigin: true,
        },
        "/api": {
          target: "http://localhost:5003",
          changeOrigin: true,
        },
      },
    },
    plugins,
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
  };
});
