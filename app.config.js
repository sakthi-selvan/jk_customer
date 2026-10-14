const releaseBuild = ['production', 'preview'].includes(process.env.EAS_BUILD_PROFILE);
const downloadsToken = process.env.RNMAPBOX_MAPS_DOWNLOAD_TOKEN || process.env.MAPBOX_DOWNLOADS_TOKEN;
if (downloadsToken) process.env.RNMAPBOX_MAPS_DOWNLOAD_TOKEN = downloadsToken;
if (releaseBuild && (!downloadsToken || downloadsToken.startsWith('@'))) {
  throw new Error('Set MAPBOX_DOWNLOADS_TOKEN in the EAS environment before building.');
}

export default {
  expo: {
    name: "JK Taxi",
    slug: "jk-taxi-customer",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    scheme: "jktaxi",
    userInterfaceStyle: "light",
    newArchEnabled: true,
    splash: {
      image: "./assets/images/splash.png",
      resizeMode: "contain",
      backgroundColor: "#2C0267",
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.jktaxi.customer",
      buildNumber: "1",
      config: {
        googleMapsApiKey: "YOUR_GOOGLE_MAPS_API_KEY",
      },
      infoPlist: {
        NSLocationWhenInUseUsageDescription:
          "JK Taxi needs your location to show nearby drivers and pickup location.",
        NSLocationAlwaysAndWhenInUseUsageDescription:
          "JK Taxi needs your location in the background to track your ride and show driver location.",
        UIBackgroundModes: ["location", "fetch", "remote-notification"],
      },
    },
    android: {
      package: "com.jktaxi.customer",
      versionCode: 1,
      adaptiveIcon: {
        foregroundImage: "./assets/images/android-icon-foreground.png",
        backgroundColor: "#2C0267",
      },
      permissions: [
        "ACCESS_COARSE_LOCATION",
        "ACCESS_FINE_LOCATION",
        "INTERNET",
        "ACCESS_NETWORK_STATE",
        "VIBRATE",
        "WAKE_LOCK",
        "android.permission.ACCESS_COARSE_LOCATION",
        "android.permission.ACCESS_FINE_LOCATION",
      ],
      config: {
        googleMaps: {
          apiKey: "YOUR_GOOGLE_MAPS_API_KEY",
        },
      },
      blockedPermissions: ["android.permission.ACCESS_BACKGROUND_LOCATION"],
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
    },
    web: {
      output: "static",
      favicon: "./assets/images/favicon.png",
    },
    plugins: [
      "expo-router",
      [
        "expo-splash-screen",
        {
          image: "./assets/images/splash.png",
          // Android 12+ shows this in a circular mask — asset already has padding;
          // keep width moderate so the full wide logo stays inside the circle.
          imageWidth: 288,
          resizeMode: "contain",
          backgroundColor: "#2C0267",
          dark: {
            image: "./assets/images/splash.png",
            imageWidth: 288,
            resizeMode: "contain",
            backgroundColor: "#2C0267",
          },
        },
      ],
      [
        "expo-location",
        {
          locationAlwaysAndWhenInUsePermission:
            "Allow JK Taxi to access your location to show nearby drivers and optimize your ride experience.",
          isAndroidBackgroundLocationEnabled: false,
          isIosBackgroundLocationEnabled: true,
        },
      ],
      [
        "@rnmapbox/maps",
        {
          RNMapboxMapsImpl: "mapbox",
        },
      ],
      "@react-native-community/datetimepicker",
      "expo-font",
    ],
    experiments: {
      typedRoutes: true,
      reactCompiler: true,
    },
    extra: {
      eas: {
        projectId: "f59eee7b-5925-4062-8a2b-524dc1cee38d",
      },
      router: {},
    },
    owner: "ssakthitselvan",
  },
};
