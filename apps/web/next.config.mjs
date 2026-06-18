import createNextIntlPlugin from "next-intl/plugin";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const withNextIntl = createNextIntlPlugin();
const appDirectory = dirname(fileURLToPath(import.meta.url));
const workspaceRoot = resolve(appDirectory, "../..");
const ignoredWatchPaths = [
  "**/node_modules/**",
  "**/.git/**",
  "**/.next/**",
  "**/.pnpm-store/**",
  "**/.ruff_cache/**",
  "**/.venv/**",
  "C:/DumpStack.log.tmp",
  "C:/hiberfil.sys",
  "C:/pagefile.sys",
  "C:/swapfile.sys"
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typedRoutes: true,
  outputFileTracingRoot: workspaceRoot,
  webpack(config) {
    config.watchOptions = {
      ...config.watchOptions,
      ignored: ignoredWatchPaths
    };

    return config;
  }
};

export default withNextIntl(nextConfig);
