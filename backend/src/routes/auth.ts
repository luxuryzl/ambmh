import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { ok, fail } from "../utils/reply.js";
import { hashPassword, verifyPassword } from "../utils/password.js";
import { envelope, errorEnvelope } from "../schemas/envelope.js";

const RegisterBody = z.object({
  username: z.string().min(3).max(32),
  password: z.string().min(6).max(64),
  nickname: z.string().max(32).optional(),
});

const LoginBody = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

const UserData = {
  type: "object",
  properties: {
    id: { type: "string" },
    username: { type: "string" },
    nickname: { type: ["string", "null"] },
    createdAt: { type: "string" },
  },
  required: ["id", "username", "createdAt"],
} as const;

const TokenData = {
  type: "object",
  properties: {
    token: { type: "string" },
    user: UserData,
  },
  required: ["token", "user"],
} as const;

const authRoutes: FastifyPluginAsync = async (app) => {
  // 1.注册
  app.post(
    "/auth/register",
    {
      config: { rateLimit: { max: 10, timeWindow: "1 minute" } },
      schema: {
        tags: ["auth"],
        summary: "用户注册",
        body: {
          type: "object",
          properties: {
            username: { type: "string", minLength: 3, maxLength: 32 },
            password: { type: "string", minLength: 6, maxLength: 64 },
            nickname: { type: "string", maxLength: 32 },
          },
          required: ["username", "password"],
        },
        response: {
          200: envelope(UserData),
          400: errorEnvelope,
          409: errorEnvelope,
        },
      },
    },
    async (req, reply) => {
      const parsed = RegisterBody.safeParse(req.body);
      if (!parsed.success)
        return fail(reply, 400, parsed.error.issues[0]?.message ?? "参数错误");

      const { username, password, nickname } = parsed.data;

      const exists = await app.prisma.user.findUnique({
        where: { username },
      });

      if (exists) return fail(reply, 409, "用户名已存在");

      const user = await app.prisma.user.create({
        data: {
          username,
          passwordHash: await hashPassword(password),
          nickname: nickname ?? null,
        },
      });

      return ok(
        reply,
        {
          id: user.id,
          username: user.username,
          nickname: user.nickname,
          createdAt: user.createdAt.toISOString(),
        },
        "注册成功",
      );
    },
  );

  // 2.登录
  app.post(
    "/auth/login",
    {
      config: { rateLimit: { max: 20, timeWindow: "1 minute" } },
      schema: {
        tags: ["auth"],
        summary: "用户登录",
        body: {
          type: "object",
          properties: {
            username: { type: "string" },
            password: { type: "string" },
          },
          required: ["username", "password"],
        },
        response: {
          200: envelope(TokenData),
          400: errorEnvelope,
          401: errorEnvelope,
        },
      },
    },
    async (req, reply) => {
      const parsed = LoginBody.safeParse(req.body);
      if (!parsed.success) return fail(reply, 400, "参数错误");

      const { username, password } = parsed.data;

      const user = await app.prisma.user.findUnique({
        where: { username },
      });

      if (!user) return fail(reply, 401, "用户名或密码错误");

      const valid = await verifyPassword(password, user.passwordHash);

      if (!valid) return fail(reply, 401, "用户名或密码错误");

      const token = await reply.jwtSign({
        id: user.id,
        username: user.username,
      });

      return ok(
        reply,
        {
          token,
          user: {
            id: user.id,
            username: user.username,
            nickname: user.nickname ?? null,
            createdAt: user.createdAt.toISOString(),
          },
        },
        "登录成功",
      );
    },
  );

  // 3.当前用户
  app.get(
    "/auth/me",
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ["auth"],
        summary: "获取当前用户信息",
        // 它向 API 的消费者（前端开发者、第三方集成者）明确声明：‌“这个接口不是公开的，你必须提供 Bearer Token 才能调用。”‌ 这是一种契约式的文档描述
        security: [{ bearerAuth: [] }], //这一行代码本身没有任何实际的安全防护功能！
        response: {
          200: envelope(UserData),
          401: errorEnvelope,
        },
      },
    },
    async (req, reply) => {
      const user = await app.prisma.user.findUnique({
        where: { id: req.user.id },
      });

      if (!user) return fail(reply, 401, "用户不存在");

      return ok(
        reply,
        {
          id: user.id,
          username: user.username,
          nickname: user.nickname,
          createdAt: user.createdAt.toISOString(),
        },
        "获取用户信息成功",
      );
    },
  );
};

export default authRoutes;
