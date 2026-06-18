import createNextIntlPlugin from "next-intl/plugin";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const withNextIntl = createNextIntlPlugin();
const appDirectory = dirname(fileURLToPath(import.meta.url));
const workspaceRoot = resolve(appDirectory, "../..");
const ignoredWatchPaths =
  /(?:[A-Z]:[\\/](?:DumpStack\.log\.tmp|hiberfil\.sys|pagefile\.sys|swapfile\.sys)$|[\\/](?:node_modules|\.git|\.next|\.pnpm-store|\.ruff_cache|\.venv)[\\/])/i;

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
