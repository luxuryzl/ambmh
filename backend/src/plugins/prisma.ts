import fp from "fastify-plugin";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaClient } from "../generated/prisma/client.js";
import { env } from "../utils/env.js";
import path from "node:path";
import { fileURLToPath } from "node:url";

declare module "fastify" {
  interface FastifyInstance {
    prisma: PrismaClient;
  }
}

// 当前文件（prisma.ts）所在目录的绝对路径
// 开发时是 backend/src/plugins，构建后是 backend/dist/plugins
const __dirname = path.dirname(fileURLToPath(import.meta.url));
// 都需要向上两级回到backend目录
const BACKEND_DIR = path.resolve(__dirname, "../../");
// 拼到prisma/dev.db绝对路径
const dbPath = path.resolve(BACKEND_DIR, "prisma", "dev.db"); //resolve永远是绝对路径，jion是相对

export default fp(
  async (app) => {
    const adapter = new PrismaBetterSqlite3({
      // url: env.DATABASE_URL.replace(/^file:/, ""), // 这个写法如果不是在backend目录下执行node，会报错
      url: dbPath,
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
