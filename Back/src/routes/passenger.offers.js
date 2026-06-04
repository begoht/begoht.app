const express = require("express");
const PassengerOffer = require("../models/PassengerOffer");
const authAdmin = require("../middleware/authAdmin");

const router = express.Router();

const THEMES = new Set(["primary", "package", "wallet", "gold", "emerald", "night"]);
const PLACEMENTS = new Set(["home", "promos", "both"]);
const STATUSES = new Set(["draft", "published", "paused", "archived"]);

const DEFAULT_OFFERS = [
  {
    title: "-25% aujourd'hui",
    kicker: "Trajet premium",
    description: "Activez votre course avec Wallet BeGO et profitez d'un tarif preferentiel.",
    badgeLabel: "BeGO+",
    icon: "fa-bolt",
    theme: "primary",
    placement: "both",
    status: "published",
    sortOrder: 10,
    actionRoute: "#/wallet",
  },
  {
    title: "Jusqu'a 5 kg",
    kicker: "Colis rapide",
    description: "Envoyez un paquet avec code de livraison securise en 4 chiffres.",
    badgeLabel: "Colis",
    icon: "fa-box",
    theme: "package",
    placement: "both",
    status: "published",
    sortOrder: 20,
    actionRoute: "#/",
  },
  {
    title: "Bonus Wallet",
    kicker: "Paiement malin",
    description: "Rechargez votre solde et gardez vos trajets, recus et promotions au meme endroit.",
    badgeLabel: "Wallet",
    icon: "fa-wallet",
    theme: "wallet",
    placement: "both",
    status: "published",
    sortOrder: 30,
    actionRoute: "#/wallet",
  },
];

function cleanText(value, fallback = "", max = 120) {
  const source =
    value === undefined || value === null || value === ""
      ? (fallback ?? "")
      : value;

  return String(source)
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

function parseDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function normalizePayload(body = {}, fallback = {}) {
  const theme = THEMES.has(body.theme) ? body.theme : fallback.theme || "primary";
  const placement = PLACEMENTS.has(body.placement) ? body.placement : fallback.placement || "both";
  const status = STATUSES.has(body.status) ? body.status : fallback.status || "draft";
  const sortOrder = Number(body.sortOrder);

  return {
    title: cleanText(body.title, fallback.title, 80),
    kicker: cleanText(body.kicker, fallback.kicker || "Offre BeGO", 40),
    description: cleanText(body.description, fallback.description, 180),
    badgeLabel: cleanText(body.badgeLabel, fallback.badgeLabel || "BeGO", 24),
    icon: cleanText(body.icon, fallback.icon || "fa-gift", 40).replace(/[^a-z0-9 -]/gi, ""),
    theme,
    placement,
    status,
    city: cleanText(body.city, fallback.city || "all", 40).toLowerCase() || "all",
    ctaLabel: cleanText(body.ctaLabel, fallback.ctaLabel || "Voir", 28),
    actionRoute: cleanText(body.actionRoute, fallback.actionRoute || "#/promos", 120),
    sortOrder: Number.isFinite(sortOrder) ? sortOrder : Number(fallback.sortOrder || 100),
    startsAt: parseDate(body.startsAt) || null,
    endsAt: parseDate(body.endsAt) || null,
  };
}

function serialize(offer) {
  return {
    id: offer._id?.toString?.() || offer.id,
    title: offer.title,
    kicker: offer.kicker,
    description: offer.description,
    badgeLabel: offer.badgeLabel,
    icon: offer.icon,
    theme: offer.theme,
    placement: offer.placement,
    status: offer.status,
    city: offer.city || "all",
    ctaLabel: offer.ctaLabel,
    actionRoute: offer.actionRoute,
    sortOrder: offer.sortOrder,
    startsAt: offer.startsAt || null,
    endsAt: offer.endsAt || null,
    createdAt: offer.createdAt || null,
    updatedAt: offer.updatedAt || null,
  };
}

async function ensureDefaults() {
  const total = await PassengerOffer.countDocuments({});
  if (total > 0) return;
  await PassengerOffer.insertMany(DEFAULT_OFFERS);
}

function publicFilter({ placement, city }) {
  const now = new Date();
  const placementFilter = PLACEMENTS.has(placement) && placement !== "both"
    ? { placement: { $in: [placement, "both"] } }
    : { placement: { $in: ["home", "promos", "both"] } };
  const cityClean = cleanText(city, "all", 40).toLowerCase();

  return {
    status: "published",
    ...placementFilter,
    city: { $in: ["all", cityClean || "all"] },
    $and: [
      { $or: [{ startsAt: null }, { startsAt: { $lte: now } }] },
      { $or: [{ endsAt: null }, { endsAt: { $gte: now } }] },
    ],
  };
}

router.get("/offers/passenger", async (req, res) => {
  try {
    await ensureDefaults();
    const limit = Math.min(Math.max(Number(req.query.limit) || 8, 1), 20);
    const offers = await PassengerOffer.find(
      publicFilter({
        placement: String(req.query.placement || "home"),
        city: String(req.query.city || "all"),
      })
    )
      .sort({ sortOrder: 1, createdAt: -1 })
      .limit(limit)
      .lean();

    res.json({ offers: offers.map(serialize), serverTime: new Date().toISOString() });
  } catch (err) {
    console.error("Passenger offers error:", err);
    res.status(500).json({ error: "No se pudieron cargar las ofertas" });
  }
});

router.get("/admin/offers", authAdmin, async (req, res) => {
  try {
    await ensureDefaults();
    const offers = await PassengerOffer.find({})
      .sort({ status: 1, sortOrder: 1, createdAt: -1 })
      .lean();

    res.json({ offers: offers.map(serialize) });
  } catch (err) {
    console.error("Admin offers list error:", err);
    res.status(500).json({ error: "No se pudieron cargar las ofertas" });
  }
});

router.post("/admin/offers", authAdmin, async (req, res) => {
  try {
    const payload = normalizePayload(req.body);

    if (!payload.title) {
      return res.status(400).json({ error: "El titulo es obligatorio" });
    }

    if (payload.startsAt && payload.endsAt && payload.endsAt < payload.startsAt) {
      return res.status(400).json({ error: "La fecha de fin debe ser posterior al inicio" });
    }

    const offer = await PassengerOffer.create({
      ...payload,
      createdBy: req.user?._id || null,
      updatedBy: req.user?._id || null,
    });

    res.status(201).json(serialize(offer.toObject()));
  } catch (err) {
    console.error("Admin offers create error:", err);
    res.status(500).json({ error: "No se pudo crear la oferta" });
  }
});

router.put("/admin/offers/:id", authAdmin, async (req, res) => {
  try {
    const current = await PassengerOffer.findById(req.params.id).lean();
    if (!current) return res.status(404).json({ error: "Oferta no encontrada" });

    const payload = normalizePayload(req.body, current);

    if (!payload.title) {
      return res.status(400).json({ error: "El titulo es obligatorio" });
    }

    if (payload.startsAt && payload.endsAt && payload.endsAt < payload.startsAt) {
      return res.status(400).json({ error: "La fecha de fin debe ser posterior al inicio" });
    }

    const offer = await PassengerOffer.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          ...payload,
          updatedBy: req.user?._id || null,
          archivedAt: payload.status === "archived" ? new Date() : null,
        },
      },
      { new: true }
    ).lean();

    res.json(serialize(offer));
  } catch (err) {
    console.error("Admin offers update error:", err);
    res.status(500).json({ error: "No se pudo actualizar la oferta" });
  }
});

router.patch("/admin/offers/:id/status", authAdmin, async (req, res) => {
  try {
    const status = String(req.body?.status || "");
    if (!STATUSES.has(status)) {
      return res.status(400).json({ error: "Estado invalido" });
    }

    const offer = await PassengerOffer.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          status,
          updatedBy: req.user?._id || null,
          archivedAt: status === "archived" ? new Date() : null,
        },
      },
      { new: true }
    ).lean();

    if (!offer) return res.status(404).json({ error: "Oferta no encontrada" });
    res.json(serialize(offer));
  } catch (err) {
    console.error("Admin offers status error:", err);
    res.status(500).json({ error: "No se pudo cambiar el estado" });
  }
});

router.delete("/admin/offers/:id", authAdmin, async (req, res) => {
  try {
    const offer = await PassengerOffer.findByIdAndUpdate(
      req.params.id,
      {
        $set: {
          status: "archived",
          archivedAt: new Date(),
          updatedBy: req.user?._id || null,
        },
      },
      { new: true }
    ).lean();

    if (!offer) return res.status(404).json({ error: "Oferta no encontrada" });
    res.json(serialize(offer));
  } catch (err) {
    console.error("Admin offers archive error:", err);
    res.status(500).json({ error: "No se pudo archivar la oferta" });
  }
});

module.exports = router;
