const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Add mapbox configuration
config.resolver.assetExts.push('db');

module.exports = config;
