import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.mundus.trade",
  appName: "Mundus Trade",
  webDir: "dist",
  server: {
    androidScheme: "https",
  },
};

export default config;
