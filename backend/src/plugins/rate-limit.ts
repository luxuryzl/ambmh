import fp from "fastify-plugin";
import rateLimit from "@fastify/rate-limit";

export default fp(
  async (app) => {
    await app.register(rateLimit, {
      max: 300,
      timeWindow: "1 minute",
      // 后续登录接口会单独设置更严格的限制
      errorResponseBuilder: (_req, ctx) => ({
        code: 429,
        message: `You have made ${ctx.ttl} requests in the last minute. Please try again in a minute.`,
        data: null,
      }),
    });
  },
  { name: "rate-limit" },
);
