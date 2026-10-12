import fp from "fastify-plugin";
import cors from "@fastify/cors";
import { env } from "../utils/env.js";

export default fp(
  async (app) => {
    const origins = env.CORS_ORIGIN.split(",").map((s) => s.trim()); //当有多个地址时才有用

    await app.register(cors, {
      origin: env.CORS_ORIGIN.split(",").map((s) => s.trim()),
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      credentials: true, //[krəˈdenʃlz] n. 证件  允许跨域请求携带和接收认证凭证（如 Cookies、HTTP 认证信息或客户端 SSL 证书）
      allowedHeaders: ["Content-Type", "Authorization"],
    });
  },
  { name: "cors" },
);
