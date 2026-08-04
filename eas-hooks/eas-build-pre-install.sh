#!/usr/bin/env bash

# EAS Build Pre-Install Hook
# This ensures Mapbox download token is available in gradle.properties

set -e

echo "🔧 Setting up Mapbox download token..."

if [ -n "$MAPBOX_DOWNLOADS_TOKEN" ]; then
  echo "✅ MAPBOX_DOWNLOADS_TOKEN found in environment"

  # Ensure gradle.properties exists
  if [ ! -f "android/gradle.properties" ]; then
    echo "⚠️ android/gradle.properties not found, creating..."
    mkdir -p android
    touch android/gradle.properties
  fi

  # Add or update the token in gradle.properties
  if grep -q "MAPBOX_DOWNLOADS_TOKEN" android/gradle.properties; then
    echo "📝 Updating existing MAPBOX_DOWNLOADS_TOKEN in gradle.properties"
    sed -i "s|MAPBOX_DOWNLOADS_TOKEN=.*|MAPBOX_DOWNLOADS_TOKEN=$MAPBOX_DOWNLOADS_TOKEN|" android/gradle.properties
  else
    echo "📝 Adding MAPBOX_DOWNLOADS_TOKEN to gradle.properties"
    echo "MAPBOX_DOWNLOADS_TOKEN=$MAPBOX_DOWNLOADS_TOKEN" >> android/gradle.properties
  fi

  echo "✅ Mapbox download token configured successfully"
else
  echo "❌ ERROR: MAPBOX_DOWNLOADS_TOKEN not found in environment variables!"
  exit 1
fi
