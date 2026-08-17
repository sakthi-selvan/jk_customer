#!/usr/bin/env node
/**
 * Fail install if expo-asset resolves to a version incompatible with the installed Expo SDK.
 * Prevents NoClassDefFoundError: expo.modules.asset.AssetModule on Android dev builds.
 */
const { execSync } = require('child_process');
const { readFileSync } = require('fs');
const { dirname, join } = require('path');

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function collectAssetVersions(node, out = new Set()) {
  if (!node || typeof node !== 'object') return out;
  if (node.name === 'expo-asset' && node.version) out.add(node.version);
  for (const dep of Object.values(node.dependencies || {})) {
    collectAssetVersions(dep, out);
  }
  return out;
}

try {
  const expoPkg = readJson(require.resolve('expo/package.json'));
  const bundledPath = join(dirname(require.resolve('expo/package.json')), 'bundledNativeModules.json');
  const bundled = readJson(bundledPath);
  const expectedRange = bundled['expo-asset'];
  if (!expectedRange) {
    console.warn('[verify-expo-native-deps] expo-asset not listed in bundledNativeModules — skipping.');
    process.exit(0);
  }

  const rootAssetPkg = readJson(require.resolve('expo-asset/package.json'));
  const rootVersion = rootAssetPkg.version;
  const expectedMajor = String(expectedRange).replace(/[^\d.]/g, '').split('.')[0];
  const rootMajor = rootVersion.split('.')[0];

  if (rootMajor !== expectedMajor) {
    console.error(
      `\n[verify-expo-native-deps] Incompatible expo-asset@${rootVersion} for Expo ${expoPkg.version} (expects ${expectedRange}).\n` +
        'This causes Android crashes: NoClassDefFoundError AssetModule.\n' +
        'Fix: add "expo-asset": "' + expectedRange + '" and npm overrides, then run npm install.\n',
    );
    process.exit(1);
  }

  let tree;
  try {
    tree = JSON.parse(execSync('npm ls expo-asset --json', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }));
  } catch (error) {
    tree = JSON.parse(String(error.stdout || '{}'));
  }

  const versions = [...collectAssetVersions(tree)];
  const bad = versions.filter((version) => version.split('.')[0] !== expectedMajor);

  if (bad.length > 0) {
    console.error(
      `\n[verify-expo-native-deps] Found incompatible expo-asset version(s): ${bad.join(', ')} (expected ${expectedRange}).\n` +
        'Run: rm -rf node_modules package-lock.json && npm install\n',
    );
    process.exit(1);
  }

  console.log(`[verify-expo-native-deps] OK expo-asset@${rootVersion} (Expo ${expoPkg.version}, expected ${expectedRange})`);
} catch (error) {
  console.error('[verify-expo-native-deps] Check failed:', error.message);
  process.exit(1);
}
