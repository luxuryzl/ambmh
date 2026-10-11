import fp from "fastify-plugin";
import jwt from "@fastify/jwt";
import { env } from "../utils/env.js";

export interface JwtPayload {
  id: string; // userId
  username: string;
}

/**
 * 类型安全地扩展 JWT 载荷,同样起到了‌模块扩充的作用，但它的目标对象和目的与之前针对 Fastify 实例的扩充有所不同
 */
declare module "@fastify/jwt" {
  interface FastifyJWT {
    //@fastify/jwt 库内部定义了一个名为 FastifyJWT 的接口，专门用于让用户扩充 JWT 相关的类型
    payload: JwtPayload; //当jwt.sign() 生成 token 时，以及 jwt.verify() 或 request.jwtVerify() 解码后得到的原始载荷结构
    user: JwtPayload; //当使用request.user时，Fastify会返回一个包含用户ID和用户名两个字段的对象。
  }
}

// 当声明了这部分类型，你在业务代码中使用 JWT 相关功能时，就会获得完整的‌类型提示‌和‌编译时检查‌

export default fp(
  async (app) => {
    await app.register(jwt, {
      secret: env.JWT_SECRET,
      sign: { expiresIn: env.JWT_EXPIRES_IN },
    });
  },
  { name: "jwt" },
);
