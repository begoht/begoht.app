require("dotenv").config();

const mongoose = require("mongoose");
const User = require("../src/models/User");
const { normalizeInternationalPhone } = require("../src/utils/phone");

function key(parts) {
  return parts.map((part) => String(part || "").toLowerCase()).join("|");
}

function pushGroup(map, groupKey, value) {
  if (!map.has(groupKey)) map.set(groupKey, []);
  map.get(groupKey).push(value);
}

async function dropIndexIfExists(collection, indexName) {
  const indexes = await collection.indexes();
  if (!indexes.some((index) => index.name === indexName)) return false;
  await collection.dropIndex(indexName);
  return true;
}

async function main() {
  if (!process.env.MONGO_URI) {
    throw new Error("MONGO_URI no configurado");
  }

  await mongoose.connect(process.env.MONGO_URI);

  const users = await User.find()
    .select("_id telefono email rol")
    .lean();

  const invalidPhones = [];
  const phoneGroups = new Map();
  const emailGroups = new Map();
  const updates = [];

  for (const user of users) {
    const rol = user.rol || "pasajero";
    const telefono = normalizeInternationalPhone(user.telefono);

    if (!/^\+\d{8,15}$/.test(telefono)) {
      invalidPhones.push({
        id: String(user._id),
        rol,
        telefono: user.telefono || "",
      });
      continue;
    }

    pushGroup(phoneGroups, key([telefono, rol]), {
      id: String(user._id),
      rol,
      telefono,
    });

    const email = String(user.email || "").trim().toLowerCase();
    if (email) {
      pushGroup(emailGroups, key([email, rol]), {
        id: String(user._id),
        rol,
        email,
      });
    }

    const update = {
      $set: {
        telefono,
      },
    };

    if (email) {
      update.$set.email = email;
    } else {
      update.$unset = { email: "" };
    }

    updates.push({
      updateOne: {
        filter: { _id: user._id },
        update,
      },
    });
  }

  const duplicatePhones = [...phoneGroups.values()].filter((items) => items.length > 1);
  const duplicateEmails = [...emailGroups.values()].filter((items) => items.length > 1);

  if (invalidPhones.length || duplicatePhones.length || duplicateEmails.length) {
    console.error(JSON.stringify({
      ok: false,
      invalidPhones,
      duplicatePhones,
      duplicateEmails,
    }, null, 2));
    throw new Error("Datos de usuarios requieren revision antes de migrar indices");
  }

  if (updates.length) {
    await User.bulkWrite(updates, { ordered: false });
  }

  const collection = User.collection;
  const droppedPhone = await dropIndexIfExists(collection, "telefono_1");
  const droppedEmail = await dropIndexIfExists(collection, "email_1");

  await collection.createIndex(
    { telefono: 1, rol: 1 },
    { unique: true, name: "telefono_1_rol_1" }
  );

  await collection.createIndex(
    { email: 1, rol: 1 },
    {
      unique: true,
      name: "email_1_rol_1",
      partialFilterExpression: { email: { $exists: true, $type: "string" } },
    }
  );

  console.log(JSON.stringify({
    ok: true,
    users: users.length,
    updated: updates.length,
    droppedPhone,
    droppedEmail,
    indexes: ["telefono_1_rol_1", "email_1_rol_1"],
  }, null, 2));
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
