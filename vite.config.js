import { defineConfig } from "vite";
import path from "path";
import cssInjectedByJsPlugin from "vite-plugin-css-injected-by-js";

export default defineConfig({
  plugins: [cssInjectedByJsPlugin()],
  build: {
    lib: {
      entry: path.resolve(__dirname, "src/index.js"),
      name: "clippy",
      formats: ["es", "umd"],
      fileName: (format) => `clippy-js-enhanced.${format === "es" ? "js" : "umd.cjs"}`,
    },
    rollupOptions: {
      external: ["jquery"],
      output: {
        globals: {
          jquery: "$",
        },
        exports: "named",
      },
    },
  },
});
