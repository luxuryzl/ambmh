import { buildApp } from "./app.js";
import { env } from "./utils/env.js";

async function main() {
  const app = await buildApp();

  const shutdown = async (signal: string) => {
    app.log.info({ signal }, "shutting down...");
    try {
      await app.close();
      process.exit(0);
    } catch (err) {
      app.log.error({ err }, "shutdown error");
      process.exit(1);
    }
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("unhandledRejection", (reason) => {
    app.log.error({ reason }, "unhandledRejection");
  });

  try {
    await app.listen({ host: env.HOST, port: env.PORT });
    app.log.info(`API ready at http://${env.HOST}:${env.PORT}`);
    app.log.info(`health: http://${env.HOST}:${env.PORT}/health`);
  } catch (err) {
    app.log.error({ err }, "failed to startup");
    process.exit(1);
  }
}

void main();
