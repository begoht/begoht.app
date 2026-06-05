export function initGanancias() {
  const user = getStoredUser();
  const referralCode = buildReferralCode(user);

  setText("codigoReferido", referralCode);

  document.getElementById("btnMotorista")?.addEventListener("click", () => {
    localStorage.setItem("quiero_ser_motorista", "true");
    window.location.href = getDriverRegisterUrl();
  });

  document.getElementById("btnEnvios")?.addEventListener("click", () => {
    localStorage.setItem("bego_servicio_preferido", "envio");
    showToast("Service colis pret sur la carte.");
    window.location.hash = "#/";
  });

  document.getElementById("btnCopiarCodigo")?.addEventListener("click", async () => {
    await copyText(referralCode);
  });

  document.getElementById("btnReferidos")?.addEventListener("click", async () => {
    const shareUrl = `${getPublicOrigin()}/registro.html?ref=${encodeURIComponent(referralCode)}`;
    const text = `Rejoins BeGO avec mon code ${referralCode}: ${shareUrl}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: "BeGO",
          text,
          url: shareUrl,
        });
        showToast("Invitation partagee.");
        return;
      } catch (err) {
        if (err?.name === "AbortError") return;
      }
    }

    await copyText(text, "Invitation copiee.");
  });
}

function getStoredUser() {
  return safeJson(localStorage.getItem("BeGO_user"))
    || safeJson(localStorage.getItem("usuario"))
    || safeJson(localStorage.getItem("user"))
    || null;
}

function safeJson(value) {
  try {
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

function buildReferralCode(user) {
  const namePart = String(user?.nombre || "BEGO")
    .replace(/[^a-z0-9]/gi, "")
    .slice(0, 4)
    .toUpperCase()
    .padEnd(4, "X");
  const phonePart = String(user?.telefono || user?._id || "")
    .replace(/\D/g, "")
    .slice(-4)
    .padStart(4, "0");

  return `${namePart}${phonePart}`;
}

function getDriverRegisterUrl() {
  if (window.Capacitor || window.cordova) {
    return "https://bego.com.ht/driver/registro.html";
  }

  if (window.location.pathname.includes("/front/www/")) {
    return "../../front-driver/www/registro.html";
  }

  return "/driver/registro.html";
}

function getPublicOrigin() {
  const origin = window.location.origin || "";
  if (/^https?:\/\//i.test(origin) && !origin.includes("capacitor://")) {
    return origin;
  }

  return "https://bego.com.ht";
}

async function copyText(text, message = "Code copie.") {
  try {
    if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
    await navigator.clipboard.writeText(text);
    showToast(message);
  } catch {
    showToast("Copiez le code manuellement.");
  }
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function showToast(message) {
  let toast = document.getElementById("headerToast");

  if (!toast) {
    toast = document.createElement("div");
    toast.id = "headerToast";
    toast.className = "header-toast";
    toast.setAttribute("role", "status");
    document.body.appendChild(toast);
  }

  toast.textContent = message;
  toast.classList.add("visible");

  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => {
    toast.classList.remove("visible");
  }, 2400);
}
