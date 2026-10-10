import fp from "fastify-plugin";
import { env } from "../utils/env.js";

export default fp(
  // Fastify 自带pino，这里只需配置
  // 注意：logger必须在Fastify实例创建时传入，见app.ts
  async (app) => {
    app.log.info({ env: env.NODE_ENV, level: env.LOG_LEVEL }, "logger ready");
  },
  { name: "logger" },
);
