/** @type {import('next').NextConfig} */
const nextConfig = {
    eslint: {
        // Warning: This allows production builds to successfully complete even if
        // your project has ESLint errors.
        ignoreDuringBuilds: true,
    },
    typescript: {
        // !! WARN !!
        // Dangerously allow production builds to successfully complete even if
        // your project has type errors.
        // !! WARN !!
        ignoreBuildErrors: true,
    },
    experimental: {
        optimizePackageImports: ["@untitledui/icons"],
    },
    // Configure webpack to handle WASM files for PDFium
    webpack: (config, { isServer }) => {
        // Add WASM support
        config.experiments = {
            ...config.experiments,
            asyncWebAssembly: true,
            layers: true,
        };

        // Handle .wasm files
        config.module.rules.push({
            test: /\.wasm$/,
            type: 'asset/resource',
        });

        return config;
    },
    // Note: serverComponentsExternalPackages was removed in Next.js 15
    // The OpenAI SDK works fine in serverless without this config
};

export default nextConfig;
