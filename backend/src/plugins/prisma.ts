import fp from "fastify-plugin";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../generated/prisma/client.js";
import { env } from "../utils/env.js";

declare module "fastify" {
  interface FastifyInstance {
    prisma: PrismaClient;
  }
}

export default fp(
  async (app) => {
    const adapter = new PrismaBetterSqlite3({
      url: env.DATABASE_URL.replace(/^file:/, ""), // remove file: prefix
    });

    const prisma = new PrismaClient({
      adapter,
      log: env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
    });

    // 启动时尝试连接
    try {
      await prisma.$connect();
      app.log.info("Prisma connected(sqlite)");
    } catch (e) {
      app.log.error({ err: e }, "Prisma connect error");
      throw e;
    }

    app.decorate("prisma", prisma);

    // 钩子保证进程退出时正确释放连接
    app.addHook("onClose", async (instance) => {
      await instance.prisma.$disconnect();
      instance.log.info("Prisma disconnected(sqlite)");
    });
  },
  { name: "prisma" },
);
