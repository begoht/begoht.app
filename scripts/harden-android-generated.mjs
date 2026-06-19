import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");

const files = {
  driverManifest: path.join(root, "front-driver/android/app/src/main/AndroidManifest.xml"),
  driverBuild: path.join(root, "front-driver/android/app/build.gradle"),
  driverVariables: path.join(root, "front-driver/android/variables.gradle"),
  passengerManifest: path.join(root, "front/android/app/src/main/AndroidManifest.xml"),
  passengerBuild: path.join(root, "front/android/app/build.gradle"),
};

function read(file) {
  return fs.readFileSync(file, "utf8");
}

function writeIfChanged(file, next) {
  const current = read(file);
  if (current === next) return false;
  fs.writeFileSync(file, next);
  return true;
}

function removePermission(xml, permissionName) {
  const pattern = new RegExp(
    `\\s*<uses-permission\\s+android:name="${escapeRegExp(permissionName)}"(?:\\s+tools:node="remove")?\\s*/>`,
    "g"
  );
  return xml.replace(pattern, "");
}

function ensurePermission(xml, permissionName, beforeMarker = "<uses-feature ") {
  if (xml.includes(`android:name="${permissionName}"`)) return xml;

  const line = `    <uses-permission android:name="${permissionName}" />\n`;
  const index = xml.indexOf(beforeMarker);
  if (index === -1) {
    return xml.replace(/<application/, `${line}\n    <application`);
  }

  const lineStart = xml.lastIndexOf("\n", index) + 1;
  return `${xml.slice(0, lineStart)}${line}${xml.slice(lineStart)}`;
}

function ensurePermissionRemoval(xml, permissionName) {
  if (xml.includes(`android:name="${permissionName}" tools:node="remove"`)) return xml;

  const marker = permissionName === "android.permission.ACCESS_BACKGROUND_LOCATION"
    ? '<uses-permission android:name="android.permission.FOREGROUND_SERVICE"'
    : '<uses-feature ';

  const line = `    <uses-permission android:name="${permissionName}" tools:node="remove" />\n`;
  const index = xml.indexOf(marker);
  if (index === -1) {
    return xml.replace(/<application/, `${line}\n    <application`);
  }

  const lineStart = xml.lastIndexOf("\n", index) + 1;
  return `${xml.slice(0, lineStart)}${line}${xml.slice(lineStart)}`;
}

function ensureToolsNamespace(xml) {
  if (xml.includes("xmlns:tools=")) return xml;
  return xml.replace(
    '<manifest xmlns:android="http://schemas.android.com/apk/res/android">',
    '<manifest xmlns:android="http://schemas.android.com/apk/res/android"\n    xmlns:tools="http://schemas.android.com/tools">'
  );
}

function normalizeManifestSpacing(xml) {
  return xml.replace(/\n\s*(<uses-(?:permission|feature)\b)/g, "\n    $1");
}

function ensureDriverServicePrivate(xml) {
  const service = `

        <service
            android:name="com.equimaps.capacitor_background_geolocation.BackgroundGeolocationService"
            android:exported="false"
            android:foregroundServiceType="location"
            tools:replace="android:exported,android:foregroundServiceType" />`;

  if (xml.includes('android:name="com.equimaps.capacitor_background_geolocation.BackgroundGeolocationService"')) {
    return xml.replace(
      /<service\s+android:name="com\.equimaps\.capacitor_background_geolocation\.BackgroundGeolocationService"[\s\S]*?\/>/,
      service.trimStart()
    );
  }

  return xml.replace(/\s*<\/application>/, `${service}\n    </application>`);
}

function setGradleNumber(source, key, value) {
  return source.replace(new RegExp(`(${key}\\s*=*\\s*)\\d+`), `$1${value}`);
}

function setGradleString(source, key, value) {
  return source.replace(new RegExp(`(${key}\\s+)"[^"]+"`), `$1"${value}"`);
}

function hardenSigningConfig(source) {
  let next = source
    .replace(
      /storePassword\s+System\.getenv\("BEGO_STORE_PASSWORD"\)\s*\?:\s*"[^"]*"/,
      "storePassword begoStorePassword"
    )
    .replace(
      /keyAlias\s+System\.getenv\("BEGO_KEY_ALIAS"\)\s*\?:\s*"[^"]*"/,
      "keyAlias begoKeyAlias"
    )
    .replace(
      /keyPassword\s+System\.getenv\("BEGO_KEY_PASSWORD"\)\s*\?:\s*"[^"]*"/,
      "keyPassword begoKeyPassword"
    );

  if (!next.includes("def begoSigningConfigured")) {
    next = next.replace(
      "apply plugin: 'com.android.application'",
      `apply plugin: 'com.android.application'

def begoStorePassword = System.getenv("BEGO_STORE_PASSWORD") ?: ""
def begoKeyAlias = System.getenv("BEGO_KEY_ALIAS") ?: ""
def begoKeyPassword = System.getenv("BEGO_KEY_PASSWORD") ?: ""
def begoSigningConfigured = begoStorePassword && begoKeyAlias && begoKeyPassword
def begoReleaseRequested = gradle.startParameter.taskNames.any {
    it.toLowerCase().contains("release")
}`
    );
  }

  next = next.replace(
    /if \(begoReleaseKeystore\.exists\(\)\) \{\s*signingConfig signingConfigs\.release\s*\} else \{\s*logger\.warn\("[^"]*"\)\s*\}/,
    `if (begoReleaseKeystore.exists() && begoSigningConfigured) {
                signingConfig signingConfigs.release
            } else if (begoReleaseRequested) {
                throw new GradleException("Faltan keystore o variables BEGO_STORE_PASSWORD, BEGO_KEY_ALIAS y BEGO_KEY_PASSWORD.")
            }`
  );

  return next;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

let changed = false;

let driverManifest = ensureToolsNamespace(read(files.driverManifest));
driverManifest = removePermission(driverManifest, "android.permission.ACCESS_BACKGROUND_LOCATION");
driverManifest = removePermission(driverManifest, "android.permission.USE_FINGERPRINT");
driverManifest = ensurePermission(
  driverManifest,
  "android.permission.ACCESS_BACKGROUND_LOCATION",
  '<uses-permission android:name="android.permission.FOREGROUND_SERVICE"'
);
driverManifest = ensurePermissionRemoval(driverManifest, "android.permission.USE_FINGERPRINT");
driverManifest = ensureDriverServicePrivate(driverManifest);
driverManifest = normalizeManifestSpacing(driverManifest);
changed = writeIfChanged(files.driverManifest, driverManifest) || changed;

let passengerManifest = ensureToolsNamespace(read(files.passengerManifest));
passengerManifest = removePermission(passengerManifest, "android.permission.USE_FINGERPRINT");
passengerManifest = ensurePermissionRemoval(passengerManifest, "android.permission.USE_FINGERPRINT");
passengerManifest = normalizeManifestSpacing(passengerManifest);
changed = writeIfChanged(files.passengerManifest, passengerManifest) || changed;

let driverVariables = read(files.driverVariables);
driverVariables = setGradleNumber(driverVariables, "compileSdkVersion", 36);
driverVariables = setGradleNumber(driverVariables, "targetSdkVersion", 36);
changed = writeIfChanged(files.driverVariables, driverVariables) || changed;

let driverBuild = read(files.driverBuild);
driverBuild = setGradleNumber(driverBuild, "versionCode", 14);
driverBuild = setGradleString(driverBuild, "versionName", "1.0.13");
driverBuild = hardenSigningConfig(driverBuild);
changed = writeIfChanged(files.driverBuild, driverBuild) || changed;

let passengerBuild = read(files.passengerBuild);
passengerBuild = setGradleNumber(passengerBuild, "versionCode", 10);
passengerBuild = setGradleString(passengerBuild, "versionName", "1.0.9");
passengerBuild = hardenSigningConfig(passengerBuild);
changed = writeIfChanged(files.passengerBuild, passengerBuild) || changed;

console.log(changed ? "Android generated project hardened." : "Android generated project already hardened.");
