require("dotenv").config();

const shouldVerify = process.argv.includes("--verify");
const apiUrl = String(process.env.RESEND_API_URL || "https://api.resend.com").replace(/\/$/, "");
const apiKey = String(process.env.RESEND_API_KEY || "").trim();
const expectedDomain = getEmailDomain(process.env.EMAIL_FROM);

async function request(path, options = {}) {
  const response = await fetch(`${apiUrl}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || data.error || `Resend HTTP ${response.status}`);
  }
  return data;
}

async function listDomains() {
  const result = await request("/domains");
  return Array.isArray(result.data) ? result.data : [];
}

async function run() {
  if (!apiKey) throw new Error("RESEND_API_KEY no configurado");
  if (!expectedDomain) throw new Error("EMAIL_FROM no contiene un dominio valido");

  let domains = await listDomains();
  let domain = domains.find((item) => item.name === expectedDomain);
  if (!domain) {
    throw new Error(`El dominio ${expectedDomain} no existe en la cuenta Resend`);
  }

  if (shouldVerify && domain.status !== "verified") {
    await request(`/domains/${encodeURIComponent(domain.id)}/verify`, {
      method: "POST",
    });
    domains = await listDomains();
    domain = domains.find((item) => item.id === domain.id) || domain;
  }

  console.log(JSON.stringify({
    domain: domain.name,
    status: domain.status,
    region: domain.region || null,
    verified: domain.status === "verified",
    verificationTriggered: shouldVerify,
  }, null, 2));

  if (domain.status !== "verified") process.exitCode = 2;
}

function getEmailDomain(value = "") {
  const match = String(value).match(/@([^>\s]+)>?\s*$/);
  return match?.[1]?.toLowerCase() || "";
}

run().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
