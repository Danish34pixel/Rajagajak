const mongoose = require("mongoose");
const env = require("../config/env");

const expectedIndexes = [
  {
    name: "email_unique_present",
    key: { email: 1 },
    partialFilterExpression: { email: { $type: "string" } },
  },
  {
    name: "mobile_unique_present",
    key: { mobile: 1 },
    partialFilterExpression: { mobile: { $type: "string" } },
  },
];

const ensureNoDuplicateIdentifiers = async (users) => {
  const duplicateEmail = await users
    .aggregate([
      { $match: { email: { $type: "string" } } },
      { $group: { _id: { $toLower: "$email" }, count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } },
      { $limit: 1 },
    ])
    .toArray();
  const duplicateMobile = await users
    .aggregate([
      { $match: { mobile: { $type: "string" } } },
      { $group: { _id: "$mobile", count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } },
      { $limit: 1 },
    ])
    .toArray();

  if (duplicateEmail.length || duplicateMobile.length) {
    throw new Error(
      "Duplicate email or mobile identifiers exist. Resolve them before applying unique indexes; no user data was changed.",
    );
  }
};

const migrateUserIdentifierIndexes = async () => {
  await mongoose.connect(env.mongoUri);
  try {
    const users = mongoose.connection.collection("users");
    await ensureNoDuplicateIdentifiers(users);

    const indexes = await users.indexes();
    for (const index of indexes) {
      const field =
        Object.keys(index.key || {}).length === 1
          ? Object.keys(index.key)[0]
          : null;
      const expected = expectedIndexes.find(
        (candidate) =>
          candidate.name === index.name &&
          candidate.key[field] === 1 &&
          index.unique === true &&
          index.partialFilterExpression?.[field]?.$type === "string",
      );
      if ((field === "email" || field === "mobile") && !expected) {
        await users.dropIndex(index.name);
      }
    }

    for (const index of expectedIndexes) {
      await users.createIndex(index.key, {
        name: index.name,
        unique: true,
        partialFilterExpression: index.partialFilterExpression,
      });
    }
    console.log("User email and mobile unique indexes are ready.");
  } finally {
    await mongoose.disconnect();
  }
};

migrateUserIdentifierIndexes().catch((error) => {
  console.error(`User identifier index migration failed: ${error.message}`);
  process.exitCode = 1;
});
