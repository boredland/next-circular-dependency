import { default as CircularDependencyPlugin } from "circular-dependency-plugin";
import type { NextConfig } from "next/types";

const detectedCircularDependencies = {
  server: [] as string[],
  'edge-server': [] as string[],
  client: [] as string[],
};

const defaultOptions = {
  /**
   * Exclude modules from the bundle that are not used by the project.
   * This is a RegExp, so you can use e.g. /\.test/ to exclude all tests.
   * @default /node_modules/
   */
  exclude: /node_modules/,
  include: /.*/,
  /**
   * Whether to fail the build if there are circular dependencies.
   * @default false
   */
  failOnError: false,
  allowAsyncCycles: false,
  cwd: process.cwd(),
  /**
   * Log the start of the check
   */
  onStart: ({ compilation }) => {
    console.debug(`🔎 Checking ${compilation.name} for circular dependencies`)
  },
  /**
   * Log the detected circular dependency
   */
  onDetected: ({ compilation, paths }) => {
    const message = `♻️ Circular dependency detected: ${paths.join(" -> ")}`;
    console.error(message);
    detectedCircularDependencies[
      compilation.name as keyof typeof detectedCircularDependencies
    ].push(message);
  },
  /**
   * Log the end of the check
   */
  onEnd: ({ compilation }) => {
    const detectedCircularDependenciesCount =
      detectedCircularDependencies[
        compilation.name as keyof typeof detectedCircularDependencies
      ].length;
    if (detectedCircularDependenciesCount === 0) {
      console.debug(`✅ No circular dependencies detected in ${compilation.name}`)
    } else {
      console.error(`❌ ${detectedCircularDependenciesCount} circular dependencies detected in ${compilation.name}`)
    }

    // Exit with code 1 if circular dependencies detected during the last compilation (currently `client`, as of Next.js 15.3.2)
    if (
      compilation.name === 'client' &&
      [
        ...detectedCircularDependencies.client,
        ...detectedCircularDependencies['edge-server'],
        ...detectedCircularDependencies.server,
      ].length > 0
    ) {
      console.error(
        `❌ Exiting, circular dependencies detected`
      );
      process.exit(1);
    }
  },
} satisfies CircularDependencyPlugin.Options;

export const nextCircularDependency = (
  dependencyPluginOptions: CircularDependencyPlugin.Options = defaultOptions,
): ((nextConfig: NextConfig) => NextConfig) => {
  return (nextConfig: NextConfig): NextConfig => {
    return {
      ...nextConfig,
      webpack(config, options) {
        config.plugins = [
          ...config.plugins,
          new CircularDependencyPlugin({
            ...defaultOptions,
            ...dependencyPluginOptions,
          }),
        ];
        if (typeof nextConfig.webpack === "function") {
          return nextConfig.webpack(config, options);
        }
        return config;
      },
    }
  };
};

export default nextCircularDependency;
