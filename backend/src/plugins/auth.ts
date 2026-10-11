import fp from "fastify-plugin";

// 通常用于创建‌可复用的预处理钩子（Pre-handler Hook）‌或‌中间件‌

declare module "fastify" {
  interface FastifyInstance {
    // 这里将 authenticate 定义为 FastifyInstance 接口上的一个属性，其类型是一个函数类型，无返回值
    authenticate: (
      req: import("fastify").FastifyRequest,
      reply: import("fastify").FastifyReply,
    ) => Promise<void>;
  }
}

// 可以将这个函数直接用作路由的 preHandler { preHandler: app.authenticate }

export default fp(
  async (app) => {
    app.decorate("authenticate", async function (req, reply) {
      try {
        await req.jwtVerify();
      } catch (err) {
        reply
          .status(401)
          .send({ code: 401, msg: "未登录或登录已过期", data: null });
      }
    });
  },
  { name: "auth" },
);
