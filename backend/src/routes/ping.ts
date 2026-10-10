import type { FastifyPluginAsync } from "fastify";
import { ok } from "../utils/reply.js";
import { envelope, errorEnvelope } from "../schemas/envelope.js";
import { required } from "zod/mini";
/**
 * 它的主要功能是作为一个‌轻量级的连通性检查（Connectivity Check）‌或‌活性探测（Liveness Probe）‌接口
 * 这个 /ping 接口的核心目的‌：是以最小的开销（无数据库查询、无复杂逻辑）
 * 证明‌服务器进程正在运行‌且‌路由系统工作正常‌。
 * 它是微服务架构中常见的“心跳”接口的一种 HTTP 实现形式

 */

const PingDataSchema = {
  type: "object",
  properties: {
    pong: { type: "boolean" },
    ts: { type: "number" },
  },
  required: ["pong", "ts"],
} as const;

const pingRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    "/ping",
    {
      schema: {
        tags: ["system"],
        summary: "连通性测试",
        response: {
          200: envelope(PingDataSchema),
          500: errorEnvelope,
        },
      },
    },
    async (_req, reply) => {
      return ok(reply, { pong: true, ts: Date.now() });
    },
  );
};

export default pingRoutes;
