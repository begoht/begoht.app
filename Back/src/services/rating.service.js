const mongoose = require("mongoose");
const Rating = require("../models/Rating");
const User = require("../models/User");
const Viaje = require("../models/Viaje");

const ALLOWED_TAGS = new Set([
  "safe",
  "clean",
  "polite",
  "fast",
  "route",
  "communication",
]);

function normalizeRating(value) {
  const rating = Number(value);
  if (!Number.isFinite(rating)) return null;
  return Math.max(1, Math.min(5, Math.round(rating)));
}

function normalizeComment(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 280);
}

function normalizeTags(tags) {
  if (!Array.isArray(tags)) return [];

  return [...new Set(
    tags
      .map((tag) => String(tag || "").trim().toLowerCase())
      .filter((tag) => ALLOWED_TAGS.has(tag))
  )].slice(0, 6);
}

function serializeRating(doc) {
  if (!doc) return null;

  return {
    id: doc._id?.toString(),
    viaje: doc.viaje?.toString(),
    pasajero: doc.pasajero?.toString(),
    motorista: doc.motorista?.toString(),
    rating: doc.rating,
    comentario: doc.comentario || "",
    tags: doc.tags || [],
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

async function recomputeDriverRating(motoristaId, { session } = {}) {
  const objectId = new mongoose.Types.ObjectId(motoristaId);
  const [stats] = await Rating.aggregate([
    { $match: { motorista: objectId } },
    {
      $group: {
        _id: "$motorista",
        average: { $avg: "$rating" },
        count: { $sum: 1 },
      },
    },
  ]).session(session || null);

  const rating = stats?.count ? Number(stats.average.toFixed(2)) : 5;
  const ratingCount = stats?.count || 0;

  await User.updateOne(
    { _id: objectId, rol: "motorista" },
    { $set: { rating, ratingCount } },
    { session }
  );

  return { rating, ratingCount };
}

async function submitTripRating({ viajeId, pasajeroId, rating, comentario, tags }) {
  if (!mongoose.Types.ObjectId.isValid(viajeId)) {
    const err = new Error("Viaje invalido");
    err.statusCode = 400;
    throw err;
  }

  const score = normalizeRating(rating);
  if (!score) {
    const err = new Error("La calificacion debe estar entre 1 y 5");
    err.statusCode = 400;
    throw err;
  }

  const session = await mongoose.startSession();

  try {
    let response;

    await session.withTransaction(async () => {
      const viaje = await Viaje.findOne({
        _id: viajeId,
        pasajero: pasajeroId,
      }).session(session);

      if (!viaje) {
        const err = new Error("Viaje no encontrado");
        err.statusCode = 404;
        throw err;
      }

      if (viaje.estado !== "finalizado") {
        const err = new Error("Solo puedes calificar viajes finalizados");
        err.statusCode = 409;
        throw err;
      }

      if (!viaje.motorista) {
        const err = new Error("Este viaje no tiene motorista asignado");
        err.statusCode = 409;
        throw err;
      }

      const payload = {
        rating: score,
        comentario: normalizeComment(comentario),
        tags: normalizeTags(tags),
        motorista: viaje.motorista,
      };

      const ratingDoc = await Rating.findOneAndUpdate(
        { viaje: viaje._id, pasajero: pasajeroId },
        {
          $set: payload,
          $setOnInsert: {
            viaje: viaje._id,
            pasajero: pasajeroId,
          },
        },
        { new: true, upsert: true, session, setDefaultsOnInsert: true }
      );

      viaje.rating = {
        score: ratingDoc.rating,
        comentario: ratingDoc.comentario,
        tags: ratingDoc.tags,
        pasajero: ratingDoc.pasajero,
        motorista: ratingDoc.motorista,
        submittedAt: ratingDoc.createdAt || new Date(),
        updatedAt: new Date(),
      };
      await viaje.save({ session });

      const driverStats = await recomputeDriverRating(viaje.motorista, { session });

      response = {
        rating: serializeRating(ratingDoc),
        motorista: {
          id: viaje.motorista.toString(),
          rating: driverStats.rating,
          ratingCount: driverStats.ratingCount,
        },
      };
    });

    return response;
  } finally {
    await session.endSession();
  }
}

module.exports = {
  normalizeRating,
  normalizeComment,
  normalizeTags,
  recomputeDriverRating,
  submitTripRating,
};
