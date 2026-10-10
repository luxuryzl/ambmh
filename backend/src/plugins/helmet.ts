import fp from "fastify-plugin";
import helmet from "@fastify/helmet";
import { env } from "../utils/env.js";

export default fp(
  async (app) => {
    await app.register(helmet, {
      /**
       * 开发环境放宽CSP，避免拦本地资源
       * undefined 通常意味着‌使用默认的安全策略‌或‌不显式覆盖默认行为
       * false 通常意味着‌完全禁用内容安全策略
       */
      contentSecurityPolicy: env.NODE_ENV === "development" ? undefined : false,
      crossOriginResourcePolicy: { policy: "cross-origin" },
    });
  },
  { name: "helmet" },
);
