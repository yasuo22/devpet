import { defineConfig } from "vite";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import { cpSync, rmSync, mkdirSync } from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));

// Tauri 2 + Vite 配置
// 结构：
//   tauri/index.html        —— 桌面壳入口（引用 ../devpet 的 Web 应用资源）
//   tauri/src-tauri/        —— Rust 后端
//   tauri/build/            —— Vite 中间产物
//   tauri/src/              —— frontendDist，Tauri 打包读取的最终产物
export default defineConfig({
  // 以 tauri/ 为 Vite 根目录，入口为 tauri/index.html
  root: __dirname,
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    watch: {
      ignored: ["**/src-tauri/**", "**/build/**"],
    },
  },
  envPrefix: ["VITE_", "TAURI_"],
  build: {
    target: "es2021",
    minify: "esbuild",
    sourcemap: false,
    outDir: "build",
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(__dirname, "index.html"),
    },
  },
  plugins: [
    {
      name: "copy-to-src",
      closeBundle() {
        const srcDir = resolve(__dirname, "src");
        rmSync(srcDir, { recursive: true, force: true });
        mkdirSync(srcDir, { recursive: true });
        cpSync(resolve(__dirname, "build"), srcDir, { recursive: true });
      },
    },
  ],
});
