import type { FastifyPluginAsync } from "fastify";
import { ok } from "../utils/reply.js";
import { envelope, errorEnvelope } from "../schemas/envelope.js";
/**
 * 实现了一个‌Fastify 健康检查（Health Check）插件‌。它定义了一个 /health 路由，
 * 用于返回服务器的运行状态、启动时长、当前时间和版本号。
 * 这段代码是一个标准、规范且高性能的 Fastify 健康检查模块。
 * 它不仅提供了基本的服务状态反馈，还利用 Fastify 的 Schema 特性确保了响应格式的严格性和序列化性能，同时兼顾了 API 文档的可读性。
 */
const startedAt = Date.now();

// data部分的schema，单独抽出来，可读性好
const HealthDataSchema = {
  type: "object",
  properties: {
    status: { type: "string" },
    uptime: { type: "number" },
    now: { type: "string" },
    version: { type: "string" },
  },
  required: ["status", "uptime", "now", "version"],
} as const;

const healthRoutes: FastifyPluginAsync = async (app) => {
  app.get(
    "/health",
    {
      schema: {
        // tags 和 summary 字段通常用于生成 API 文档（如使用 @fastify/swagger 插件时），将该接口标记为“系统”类接口，摘要为“健康检查”。
        tags: ["system"],
        summary: "健康检查",
        response: {
          200: envelope(HealthDataSchema), //返回一个包含数据（HealthDataSchema）的 envelope（ envelope 函数用于将数据包装成符合 API 响应格式的 envelope）,
          500: errorEnvelope,
        },
      },
    },
    async (_req, reply) => {
      return ok(reply, {
        status: "ok", //'ok'，表示服务正常运行
        uptime: Math.round((Date.now() - startedAt) / 1000), //服务器已运行的秒数
        now: new Date().toISOString(), //当前的 ISO 8601格式时间字符串
        version: process.env.npm_package_version ?? "0.1.0", //应用的版本号
      });
    },
  );
};

export default healthRoutes;
