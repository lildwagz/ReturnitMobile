// RETURNIT_ABIS (set by the "preview-arm64" profile in eas.json) limits the build to the listed CPU
// architectures, for example "arm64-v8a": a much smaller APK that runs on current phones but not on x86 emulators
// or old 32-bit phones. Without it every architecture is built (what the store build needs).
const abis = (process.env.RETURNIT_ABIS ?? '').split(',').map((s) => s.trim()).filter(Boolean);

module.exports = ({ config }) => ({
  ...config,
  plugins: [
    ...(config.plugins ?? []),
    ...(abis.length ? [['expo-build-properties', { android: { buildArchs: abis } }]] : []),
  ],
  android: {
    ...config.android,
    googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? './google-services.json',
  },
});
