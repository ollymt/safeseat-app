const fs = require("fs");
const path = require("path");
const {
  AndroidConfig,
  withAndroidManifest,
  withDangerousMod,
  withInfoPlist,
} = require("@expo/config-plugins");

const NETWORK_SECURITY_XML = `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>
  <base-config cleartextTrafficPermitted="true" />
</network-security-config>
`;

/**
 * SafeSeat Main Hub serves a read-only local HTTP API at 192.168.4.1.
 * Android 9+ blocks cleartext HTTP by default, so preview/production builds
 * explicitly allow this local transport and include the networking permissions
 * needed by React Native fetch().
 */
module.exports = function withSafeSeatLocalNetwork(config) {
  config = AndroidConfig.Permissions.withPermissions(config, [
    "android.permission.INTERNET",
    "android.permission.ACCESS_NETWORK_STATE",
    "android.permission.ACCESS_WIFI_STATE",
  ]);

  config = withAndroidManifest(config, (androidConfig) => {
    const manifest = androidConfig.modResults.manifest;
    const application = manifest.application?.[0];

    if (!application) {
      throw new Error(
        "SafeSeat local-network plugin could not find <application> in AndroidManifest.xml",
      );
    }

    application.$ = application.$ || {};
    application.$["android:usesCleartextTraffic"] = "true";
    application.$["android:networkSecurityConfig"] =
      "@xml/safeseat_network_security_config";
    return androidConfig;
  });

  config = withDangerousMod(config, [
    "android",
    async (androidConfig) => {
      const xmlDir = path.join(
        androidConfig.modRequest.platformProjectRoot,
        "app",
        "src",
        "main",
        "res",
        "xml",
      );
      fs.mkdirSync(xmlDir, { recursive: true });
      fs.writeFileSync(
        path.join(xmlDir, "safeseat_network_security_config.xml"),
        NETWORK_SECURITY_XML,
        "utf8",
      );
      return androidConfig;
    },
  ]);

  config = withInfoPlist(config, (iosConfig) => {
    iosConfig.modResults.NSLocalNetworkUsageDescription =
      "SafeSeat connects to the Main Hub on the local SafeSeat Wi-Fi network to receive live occupant-monitoring status.";

    iosConfig.modResults.NSAppTransportSecurity = {
      ...(iosConfig.modResults.NSAppTransportSecurity || {}),
      NSAllowsLocalNetworking: true,
    };

    return iosConfig;
  });

  return config;
};
