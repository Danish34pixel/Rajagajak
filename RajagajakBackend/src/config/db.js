const mongoose = require("mongoose");

const getMongoConnectionError = (error) => {
  const pendingErrors = [error];
  const seenErrors = new Set();
  const messages = [];
  const codes = [];

  while (pendingErrors.length > 0) {
    const current = pendingErrors.pop();

    if (!current || typeof current !== "object" || seenErrors.has(current)) {
      continue;
    }

    seenErrors.add(current);

    if (current.message) messages.push(current.message);
    if (current.name) messages.push(current.name);
    if (current.code !== undefined) codes.push(String(current.code));

    pendingErrors.push(current.cause, current.reason);

    if (current.reason?.servers instanceof Map) {
      for (const server of current.reason.servers.values()) {
        pendingErrors.push(server.error);
      }
    }
  }

  const details = `${messages.join(" ")} ${codes.join(" ")}`;

  if (/bad auth|authentication failed|authenticationfailure|code 18/i.test(details)) {
    return "MongoDB authentication failed. Check the Atlas Database User credentials.";
  }

  if (
    /querysrv|enotfound|eai_again|eservfail/i.test(details) ||
    codes.some((code) => ["ENOTFOUND", "EAI_AGAIN", "ESERVFAIL"].includes(code))
  ) {
    return "MongoDB DNS/SRV resolution failed. Check the Atlas cluster hostname and local DNS/network.";
  }

  if (/tls|ssl|certificate/i.test(details)) {
    return "MongoDB TLS connection failed. Check the local certificate trust and network inspection settings.";
  }

  if (/shutdowninprogress|interruptedatshutdown|replicasetnoprimary/i.test(details)) {
    return "MongoDB cluster is unavailable. Check the Atlas cluster status and resume it if paused.";
  }

  if (
    /etimedout|econnrefused|econnreset|enetunreach|ehostunreach|mongoserverselectionerror|could not connect to any servers/i.test(
      details,
    )
  ) {
    return "MongoDB servers could not be reached. Check the Atlas Network Access IP Access List, cluster status, and local firewall/VPN.";
  }

  return "MongoDB connection failed. Check the connection string and Atlas configuration.";
};

const validateMongoUri = (mongoUri) => {
  if (!/^mongodb(?:\+srv)?:\/\//i.test(mongoUri)) {
    throw new Error(
      "Invalid MONGO_URI. Use a valid mongodb:// or mongodb+srv:// connection string.",
    );
  }

  try {
    const parsedUri = new URL(mongoUri);

    if (
      !["mongodb:", "mongodb+srv:"].includes(parsedUri.protocol) ||
      !parsedUri.hostname ||
      (parsedUri.protocol === "mongodb+srv:" && parsedUri.port)
    ) {
      throw new Error("Invalid MongoDB URI");
    }
  } catch {
    throw new Error(
      "Invalid MONGO_URI. Use a valid mongodb:// or mongodb+srv:// connection string.",
    );
  }
};

const connectDB = async (mongoUri) => {
  if (!mongoUri) {
    throw new Error(
      "MONGO_URI is not configured. Please check your .env file.",
    );
  }

  validateMongoUri(mongoUri);

  try {
    await mongoose.connect(mongoUri);
    console.log("MongoDB Connected");
  } catch (error) {
    const message = getMongoConnectionError(error);
    console.error(`MongoDB connection failed: ${message}`);
    throw new Error(message, { cause: error });
  }
};

const disconnectDB = async () => {
  await mongoose.disconnect();
};

module.exports = { connectDB, disconnectDB };
