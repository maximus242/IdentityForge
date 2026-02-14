const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@identityforge/ai', '@identityforge/database', '@identityforge/types'],
  webpack: (config) => {
    // Force a single React runtime to avoid hook/context crashes from duplicate versions.
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      react: path.resolve(__dirname, '../../node_modules/react'),
      'react-dom': path.resolve(__dirname, '../../node_modules/react-dom'),
      'react/jsx-runtime': path.resolve(__dirname, '../../node_modules/react/jsx-runtime.js'),
      'react/jsx-dev-runtime': path.resolve(__dirname, '../../node_modules/react/jsx-dev-runtime.js'),
    };

    // Add support for markdown imports
    config.module.rules.push({
      test: /\.md$/,
      type: 'asset/source',
    });
    return config;
  },
};

module.exports = nextConfig;
