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
    // Externalize native modules for serverless
    webpack: (config, { isServer }) => {
        if (isServer) {
            config.externals.push({
                '@napi-rs/canvas': 'commonjs @napi-rs/canvas',
                'canvas': 'commonjs canvas',
            });
        }
        return config;
    },
};

export default nextConfig;
