const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

const getEnv = (name, fallback = "") => process.env[name]?.trim() || fallback;

const frontendUrls = getEnv(
  "FRONTEND_URLS",
  getEnv(
    "FRONTEND_URL",
    "https://rajagajak.vercel.app,http://localhost:5173,http://localhost:5174,http://localhost:8081",
  ),
)
  .split(",")
  .map((url) => url.trim().replace(/\/$/, ""))
  .filter(Boolean);

const requiredEnvironmentVariables = [
  "MONGO_URI",
  "JWT_SECRET",
  "IMAGEKIT_PRIVATE_KEY",
];

const missingEnvironmentVariables = requiredEnvironmentVariables.filter(
  (name) => !getEnv(name),
);

const imageKitPrivateKey = getEnv("IMAGEKIT_PRIVATE_KEY");
const googleMapsApiKey = getEnv("GOOGLE_MAPS_API_KEY");
const invalidImageKitConfiguration =
  !/^private_/.test(imageKitPrivateKey) ||
  /your_imagekit|replace_with/i.test(imageKitPrivateKey);

if (missingEnvironmentVariables.length > 0) {
  throw new Error(
    `Missing required environment variables:\n${missingEnvironmentVariables
      .map((name) => `- ${name}`)
      .join("\n")}`,
  );
}

if (invalidImageKitConfiguration) {
  throw new Error(
    "IMAGEKIT_PRIVATE_KEY is missing or still uses the example value. Add a real ImageKit private key beginning with private_.",
  );
}

const env = {
  nodeEnv: getEnv("NODE_ENV", "development"),
  port: Number.parseInt(getEnv("PORT", "5000"), 10),
  mongoUri: getEnv("MONGO_URI"),
  jwtSecret: getEnv("JWT_SECRET"),
  frontendUrls,
  imageKitPrivateKey,
  imageKitPublicKey: getEnv("IMAGEKIT_PUBLIC_KEY"),
  imageKitUrlEndpoint: getEnv("IMAGEKIT_URL_ENDPOINT"),
  googleMapsApiKey,
  geocodingProvider: getEnv(
    "GEOCODING_PROVIDER",
    googleMapsApiKey ? "google" : "nominatim",
  ),
  nominatimBaseUrl: getEnv(
    "NOMINATIM_BASE_URL",
    "https://nominatim.openstreetmap.org",
  ).replace(/\/$/, ""),
  geocodingUserAgent: getEnv("GEOCODING_USER_AGENT", "RajagajakStore/1.0"),
  storeLocation: {
    address: getEnv(
      "STORE_ADDRESS",
      "Shop No. 27, Peer Gate, Moti Masjid Road, Bhopal, Madhya Pradesh 462001, India",
    ),
    latitude: Number(getEnv("STORE_LATITUDE", "23.2556174")),
    longitude: Number(getEnv("STORE_LONGITUDE", "77.3994281")),
  },
  shippingRates: {
    baseDistanceKm: Number(getEnv("SHIPPING_BASE_DISTANCE_KM", "2")),
    baseCharge: Number(getEnv("SHIPPING_BASE_CHARGE", "30")),
    additionalDistanceKm: Number(
      getEnv("SHIPPING_ADDITIONAL_DISTANCE_KM", "2"),
    ),
    additionalCharge: Number(getEnv("SHIPPING_ADDITIONAL_CHARGE", "20")),
    maximumDistanceKm: Number(getEnv("MAX_DELIVERY_DISTANCE_KM", "20")),
  },
  dnsServers: getEnv("DNS_SERVERS")
    .split(",")
    .map((server) => server.trim())
    .filter(Boolean),
};

module.exports = env;
