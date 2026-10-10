import type { FastifyPluginAsync } from "fastify";
import { ok } from "../utils/reply.js";
import { envelope, errorEnvelope } from "../schemas/envelope.js";

const DbPingData = {
  type: "object",
  properties: {
    ok: { type: "boolean" },
    users: { type: "number" },
    stocks: { type: "number" },
    quotes: { type: "number" },
    now: { type: "string" },
  },
  required: ["ok", "users", "stocks", "quotes", "now"],
} as const;

const dbRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    "/db-ping",
    {
      schema: {
        tags: ["system"],
        summary: "数据库连通性检查",
        response: {
          200: envelope(DbPingData),
          500: errorEnvelope,
        },
      },
    },
    async (_req, reply) => {
      const [users, stocks, quotes] = await Promise.all([
        app.prisma.user.count(),
        app.prisma.stock.count(),
        app.prisma.dailyQuote.count(),
      ]);

      return ok(reply, {
        ok: true,
        users,
        stocks,
        quotes,
        now: new Date().toISOString(),
      });
    },
  );
};

export default dbRoutes;
