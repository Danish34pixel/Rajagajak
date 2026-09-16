const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const getEnv = (name, fallback = "") => process.env[name]?.trim() || fallback;

const requiredEnvironmentVariables = [
  "MONGO_URI",
  "JWT_SECRET",
  "IMAGEKIT_PRIVATE_KEY",
];

const missingEnvironmentVariables = requiredEnvironmentVariables.filter(
  (name) => !getEnv(name),
);

if (missingEnvironmentVariables.length > 0) {
  throw new Error(
    `Missing required environment variables:\n${missingEnvironmentVariables
      .map((name) => `- ${name}`)
      .join("\n")}`,
  );
}

const env = {
  nodeEnv: getEnv("NODE_ENV", "development"),
  port: Number.parseInt(getEnv("PORT", "5000"), 10),
  mongoUri: getEnv("MONGO_URI"),
  jwtSecret: getEnv("JWT_SECRET"),
  frontendUrl: getEnv("FRONTEND_URL", "http://localhost:5173"),
  imageKitPrivateKey: getEnv("IMAGEKIT_PRIVATE_KEY"),
  imageKitPublicKey: getEnv("IMAGEKIT_PUBLIC_KEY"),
  imageKitUrlEndpoint: getEnv("IMAGEKIT_URL_ENDPOINT"),
  dnsServers: getEnv("DNS_SERVERS")
    .split(",")
    .map((server) => server.trim())
    .filter(Boolean),
};

module.exports = env;
