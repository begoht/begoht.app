import { getServerUrl } from "../../conexion.js";

const ENABLED_KEY = "huella:pasajero:enabled";
const CREDENTIAL_KEY = "huella:pasajero:credential";

function normalizarToken(value) {
  if (value?.startsWith('"') && value.endsWith('"')) {
    return value.slice(1, -1);
  }

  return value || null;
}

function safeJson(value) {
  try {
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

function usuarioGuardado() {
  return (
    safeJson(localStorage.getItem("BeGO_user")) ||
    safeJson(localStorage.getItem("usuario")) ||
    safeJson(localStorage.getItem("user"))
  );
}

function guardarSesion(data) {
  if (data.accessToken) {
    localStorage.setItem("token", data.accessToken);
    localStorage.setItem("BeGO_token", data.accessToken);
  }

  if (data.refreshToken) {
    localStorage.setItem("refreshToken", data.refreshToken);
    localStorage.setItem("BeGO_refreshToken", data.refreshToken);
  }

  if (data.user) {
    localStorage.setItem("user", JSON.stringify(data.user));
    localStorage.setItem("usuario", JSON.stringify(data.user));
    localStorage.setItem("BeGO_user", JSON.stringify(data.user));
  }

  if (data.user?.rol) {
    localStorage.setItem("rol", data.user.rol);
  }
}

function getPlugins() {
  return window.Capacitor?.Plugins || {};
}

function base64UrlEncode(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";

  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64UrlDecode(value) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes.buffer;
}

function randomBytes(length = 32) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return bytes;
}

async function autenticarConPluginNativo() {
  const plugins = getPlugins();

  if (plugins.GoMotoBiometric?.authenticate) {
    await plugins.GoMotoBiometric.authenticate({
      title: "Huella requerida",
      subtitle: "Confirma tu identidad",
      description: "Usa la seguridad de tu celular para ingresar"
    });
    return true;
  }

  if (plugins.NativeBiometric?.verifyIdentity) {
    await plugins.NativeBiometric.verifyIdentity({
      reason: "Ingresar a GoMoto",
      title: "Huella requerida",
      subtitle: "Confirma tu identidad",
      description: "Usa tu huella para abrir la sesion guardada"
    });
    return true;
  }

  if (plugins.BiometricAuth?.authenticate) {
    await plugins.BiometricAuth.authenticate({
      reason: "Ingresar a GoMoto"
    });
    return true;
  }

  if (plugins.FingerprintAIO?.show) {
    await plugins.FingerprintAIO.show({
      title: "Huella requerida",
      subtitle: "Confirma tu identidad",
      description: "Usa tu huella para abrir la sesion guardada"
    });
    return true;
  }

  return false;
}

export function tokenGuardado() {
  return normalizarToken(localStorage.getItem("token") || localStorage.getItem("BeGO_token"));
}

export function refreshGuardado() {
  return normalizarToken(localStorage.getItem("refreshToken") || localStorage.getItem("BeGO_refreshToken"));
}

export async function renovarSesionConRefresh() {
  const refreshToken = refreshGuardado();
  if (!refreshToken) return false;

  const res = await fetch(`${getServerUrl()}/api/auth/refresh`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ refreshToken })
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok || !data.accessToken) {
    return false;
  }

  guardarSesion(data);

  return true;
}

export async function asegurarSesionParaHuella() {
  if (tokenGuardado() && usuarioGuardado()) return true;
  return renovarSesionConRefresh();
}

export function huellaActivada() {
  return localStorage.getItem(ENABLED_KEY) === "1";
}

export async function dispositivoSoportaHuella() {
  const plugins = getPlugins();

  if (plugins.GoMotoBiometric?.isAvailable) {
    const result = await plugins.GoMotoBiometric.isAvailable();
    return !!result?.available;
  }

  if (
    plugins.NativeBiometric?.verifyIdentity ||
    plugins.BiometricAuth?.authenticate ||
    plugins.FingerprintAIO?.show
  ) {
    return true;
  }

  if (!window.PublicKeyCredential || !navigator.credentials) return false;

  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

export async function registrarHuellaLocal() {
  if (!(await asegurarSesionParaHuella())) return false;
  if (!(await dispositivoSoportaHuella())) return false;

  const plugins = getPlugins();
  if (
    plugins.GoMotoBiometric?.authenticate ||
    plugins.NativeBiometric?.verifyIdentity ||
    plugins.BiometricAuth?.authenticate ||
    plugins.FingerprintAIO?.show
  ) {
    localStorage.setItem(ENABLED_KEY, "1");
    return true;
  }

  const credential = await navigator.credentials.create({
    publicKey: {
      challenge: randomBytes(32),
      rp: {
        name: "GoMoto"
      },
      user: {
        id: randomBytes(16),
        name: "pasajero@gomoto.local",
        displayName: "Pasajero GoMoto"
      },
      pubKeyCredParams: [
        { type: "public-key", alg: -7 },
        { type: "public-key", alg: -257 }
      ],
      authenticatorSelection: {
        authenticatorAttachment: "platform",
        userVerification: "required",
        residentKey: "preferred"
      },
      timeout: 60000,
      attestation: "none"
    }
  });

  if (!credential?.rawId) return false;

  localStorage.setItem(CREDENTIAL_KEY, base64UrlEncode(credential.rawId));
  localStorage.setItem(ENABLED_KEY, "1");
  return true;
}

export async function autenticarConHuella() {
  if (!huellaActivada() || !(await asegurarSesionParaHuella())) return false;

  if (await autenticarConPluginNativo()) {
    return true;
  }

  const credentialId = localStorage.getItem(CREDENTIAL_KEY);
  if (!credentialId || !navigator.credentials) return false;

  const credential = await navigator.credentials.get({
    publicKey: {
      challenge: randomBytes(32),
      allowCredentials: [
        {
          id: base64UrlDecode(credentialId),
          type: "public-key",
          transports: ["internal"]
        }
      ],
      userVerification: "required",
      timeout: 60000
    }
  });

  return !!credential;
}

export async function ofrecerActivacionHuella() {
  if (huellaActivada() || !(await dispositivoSoportaHuella())) return;

  const acepta = window.confirm("Quieres activar el ingreso con huella para la proxima vez?");
  if (!acepta) return;

  try {
    await registrarHuellaLocal();
  } catch (err) {
    console.warn("No se pudo activar huella:", err?.message || err);
  }
}
