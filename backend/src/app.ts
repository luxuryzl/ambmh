import fastify, { type FastifyInstance } from "fastify";
import { env } from "./utils/env.js";

import loggerPlugin from "./plugins/logger.js";
import corsPlugin from "./plugins/cors.js";
import helmetPlugin from "./plugins/helmet.js";
import rateLimitPlugin from "./plugins/rate-limit.js";
import healthRoutes from "./routes/health.js";
import pingRoutes from "./routes/ping.js";

//
export async function buildApp(): Promise<FastifyInstance> {
  const app = fastify({
    // 日志的核心配置（如输出格式、级别阈值等）
    logger: {
      level: env.LOG_LEVEL,
      transport:
        env.NODE_ENV === "development"
          ? {
              target: "pino-pretty",
              options: {
                colorize: true,
                translateTime: "SYS:HH:MM:ss.l", //SYS:：前缀，表示使用‌本地系统时区‌（System Time Zone），而不是默认的 UTC 时间  .l：毫秒
                ignore: "pid,hostname", //在输出的日志行中‌隐藏‌进程 ID（pid）和主机名（hostname）字段
              },
            }
          : undefined,
    },
    // 告诉 Fastify 信任反向代理服务器（如 Nginx, HAProxy, AWS ELB 等）发送的头部信息。
    trustProxy: true,
    // 只有当 logger 为 true 或配置对象时，此选项才生效
    // false 表示‌不禁用‌，即‌启用‌自动请求日志记录。这是默认行为。
    // 自动为每个请求打印 "incoming request" 和 "request completed" 日志
    // disableRequestLogging: false, //这个配置已弃用，因为默认的请求日志记录功能已经弃用
  });

  // 插件
  // 当执行 await app.register(loggerPlugin) 时，Fastify 会等待该插件函数执行完毕
  // 成功执行，证明此时 Fastify 实例已经初始化完成，且日志系统（Pino）已经正确挂载并可用
  // 这是一种“冒烟测试”或“健康检查”，确保后续的业务逻辑中可以安全地使用 app.log 进行日志记录
  await app.register(loggerPlugin); //这行代码会在服务器启动阶段输出一条关键日志，包含当前运行环境和当前配置的日志级别，便于开发和运维确认状态。
  await app.register(helmetPlugin); //为 Fastify 应用添加 HTTP 安全响应头（Security Headers）‌的作用，特别是针对‌开发环境‌和‌生产环境‌做了差异化的内容安全策略（CSP）配置，并允许跨域资源加载。
  await app.register(corsPlugin);
  await app.register(rateLimitPlugin);

  // 全局错误处理：统一响应格式
  app.setErrorHandler((err: unknown, req, reply) => {
    req.log.error({ err }, "request error");
    const status = (err as any)?.statusCode ?? 500;
    reply.status(status).send({
      code: status,
      msg:
        env.NODE_ENV === "production" && status === 500
          ? "服务器内部错误"
          : (err as any)?.message
            ? "服务器内部错误"
            : (err as any)?.message,
      data: null,
    });
  });

  app.setNotFoundHandler((req, reply) => {
    reply.status(404).send({
      code: 404,
      msg: `路由不存在：${req.method} ${req.url}`,
      data: null,
    });
  });

  // 路由：版本前缀
  await app.register(
    async (v1) => {
      await v1.register(healthRoutes);
      await v1.register(pingRoutes);
    },
    { prefix: "/api/v1" },
  );

  // 顶层 /health 也保留一份，便于探活
  await app.register(healthRoutes);

  return app;
}
