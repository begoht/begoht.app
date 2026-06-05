const AdminAuditLog = require("../models/AdminAuditLog");

const MAX_JSON_LENGTH = 6000;

function clampPayload(value) {
  if (value == null) return value;

  const plain = typeof value?.toObject === "function" ? value.toObject() : value;
  const json = JSON.stringify(plain);

  if (json.length <= MAX_JSON_LENGTH) return plain;

  return {
    truncated: true,
    preview: json.slice(0, MAX_JSON_LENGTH),
  };
}

async function logAdminAction(req, { action, entity, entityId = "", before = null, after = null, meta = null }) {
  try {
    await AdminAuditLog.create({
      actor: req.user?._id || req.user?.id || null,
      action,
      entity,
      entityId: String(entityId || ""),
      before: clampPayload(before),
      after: clampPayload(after),
      meta: clampPayload(meta),
      ip: req.ip || req.headers["x-forwarded-for"] || "",
      userAgent: req.get("user-agent") || "",
    });
  } catch (err) {
    console.error("Admin audit log error:", err.message);
  }
}

module.exports = {
  logAdminAction,
};
