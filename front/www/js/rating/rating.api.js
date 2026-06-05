import { getServerUrl } from "../conexion.js";

const QUEUE_KEY = "bego:pendingRatings";

function cleanToken(value) {
  const token = String(value || "").trim();
  return token.startsWith('"') && token.endsWith('"') ? token.slice(1, -1) : token;
}

function getToken() {
  return cleanToken(localStorage.getItem("token"));
}

function normalizePayload(payload = {}) {
  const rating = Math.max(1, Math.min(5, Math.round(Number(payload.rating || 0))));
  const comentario = String(payload.comentario || "").replace(/\s+/g, " ").trim().slice(0, 280);
  const tags = Array.isArray(payload.tags)
    ? [...new Set(payload.tags.map((tag) => String(tag || "").trim()).filter(Boolean))].slice(0, 6)
    : [];

  return { rating, comentario, tags };
}

export async function submitViajeRating(viajeId, payload = {}) {
  const token = getToken();
  if (!token) throw new Error("Session expiree");
  if (!viajeId) throw new Error("Voyage invalide");

  const res = await fetch(`${getServerUrl()}/api/viajes/${encodeURIComponent(viajeId)}/rating`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "ngrok-skip-browser-warning": "true",
    },
    body: JSON.stringify(normalizePayload(payload)),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || "Note non enregistree");
  }

  return data;
}

export function queuePendingRating(viajeId, payload = {}) {
  if (!viajeId) return;

  const pending = readQueue().filter((item) => item.viajeId !== viajeId);
  pending.push({
    viajeId,
    payload: normalizePayload(payload),
    queuedAt: new Date().toISOString(),
  });

  localStorage.setItem(QUEUE_KEY, JSON.stringify(pending.slice(-12)));
}

export async function flushPendingRatings() {
  const pending = readQueue();
  if (!pending.length) return { sent: 0, remaining: 0 };

  const remaining = [];
  let sent = 0;

  for (const item of pending) {
    try {
      await submitViajeRating(item.viajeId, item.payload);
      sent += 1;
    } catch {
      remaining.push(item);
    }
  }

  if (remaining.length) {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
  } else {
    localStorage.removeItem(QUEUE_KEY);
  }

  return { sent, remaining: remaining.length };
}

function readQueue() {
  try {
    const value = JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]");
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}
