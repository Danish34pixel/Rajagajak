const http = require("http");
const dns = require("dns");
const env = require("./config/env");
const app = require("./app");
const { connectDB, disconnectDB } = require("./config/db");

let server;

if (env.dnsServers.length > 0) {
  dns.setServers(env.dnsServers);
}

const startServer = async () => {
  console.log("MongoDB URI configured:", Boolean(env.mongoUri));
  await connectDB(env.mongoUri);

  server = http.createServer(app);
  server.on("error", async (error) => {
    const message =
      error.code === "EADDRINUSE"
        ? `Port ${env.port} is already in use.`
        : error.message;

    console.error(`Server startup failed: ${message}`);
    await disconnectDB();
    process.exit(1);
  });

  server.listen(env.port, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${env.port}`);
  });
};

const shutdown = async (signal) => {
  console.log(`${signal} received. Shutting down gracefully.`);

  if (server) {
    server.close(async () => {
      await disconnectDB();
      process.exit(0);
    });
  } else {
    await disconnectDB();
    process.exit(0);
  }
};

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));

startServer().catch((error) => {
  console.error(`Server startup failed: ${error.message}`);
  process.exit(1);
});
