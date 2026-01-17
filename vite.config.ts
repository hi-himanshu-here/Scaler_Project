import { defineConfig, type PluginOption } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig(async () => {
  const plugins: PluginOption[] = [react()];

  const isDev =
    process.env.NODE_ENV !== "production" &&
    process.env.REPL_ID !== undefined;

  if (isDev) {
    const runtimeErrorOverlay = (
      await import("@replit/vite-plugin-runtime-error-modal")
    ).default;

    const { cartographer } = await import(
      "@replit/vite-plugin-cartographer"
    );

    const { devBanner } = await import(
      "@replit/vite-plugin-dev-banner"
    );

    plugins.push(runtimeErrorOverlay());
    plugins.push(cartographer());
    plugins.push(devBanner());
  }

  return {
    plugins,
    resolve: {
      alias: {
        "@": path.resolve(import.meta.dirname, "client", "src"),
        "@shared": path.resolve(import.meta.dirname, "shared"),
      },
    },
    root: path.resolve(import.meta.dirname, "client"),
    build: {
      outDir: path.resolve(import.meta.dirname, "dist/public"),
      emptyOutDir: true,
    },
  };
});
