import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { ok, fail } from "../utils/reply.js";
import { envelope, errorEnvelope, paginated } from "../schemas/envelope.js";
import { FundFlowData } from "../schemas/fund-flow.js";
import { toFundFlowDto } from "../utils/transform.js";

// 定义资金流数据结构，用于校验请求体FlowBody.safeParse(req.body)，并设置默认值，共11个字段
// stockId不需要录入，其余10需要
const FlowBody = z.object({
  stockId: z.string().min(1),
  date: z.iso.date(),
  mainNet: z.number(),
  mainNet5d: z.number().optional().default(0),
  mainNet10d: z.number().optional().default(0),
  superLargeNet: z.number().optional().default(0),
  largeNet: z.number().optional().default(0),
  mediumNet: z.number().optional().default(0),
  smallNet: z.number().optional().default(0),
  mainNetRatio: z.number().optional(),
  turnover: z.number().optional(),
});

// 批量导入的参数格式，omit是省略stockId后的部分，
const BatchBody = z.object({
  stockId: z.string().min(1),
  items: z
    .array(FlowBody.omit({ stockId: true }))
    .min(1)
    .max(1000),
});

// 查询参数格式
const QueryParams = z.object({
  stockId: z.string().min(1),
  from: z.iso.date().optional(),
  to: z.iso.date().optional(),
  page: z.coerce.number().int().min(1).max(500).default(1),
  pageSize: z.coerce.number().int().min(1).max(500).default(50),
  order: z.enum(["asc", "desc"]).default("desc"),
});

// id参数格式
const IdParams = z.object({ id: z.string().min(1) });

const fundFlowRoutes: FastifyPluginAsync = async (app) => {
  // 1.单条录入
  app.post(
    "/fund-flow",
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ["fund-flow"],
        summary: "录入单条资金流",
        security: [{ bearerAuth: [] }],
        body: {
          type: "object",
          properties: {
            stockId: { type: "string" },
            date: { type: "string" },
            mainNet: { type: "number" },
            mainNet5d: { type: "number" },
            mainNet10d: { type: "number" },
            superLargeNet: { type: "number" },
            largeNet: { type: "number" },
            mediumNet: { type: "number" },
            smallNet: { type: "number" },
            mainNetRatio: { type: "number" },
            turnover: { type: "number" },
          },
          required: ["stockId", "date", "mainNet"],
        },
        response: {
          200: envelope(FundFlowData),
          400: errorEnvelope,
          404: errorEnvelope,
        },
      },
    },
    async (req, reply) => {
      const parsed = FlowBody.safeParse(req.body);
      if (!parsed.success) {
        return fail(reply, 400, parsed.error.issues[0]?.message ?? "参数错误");
      }

      const stock = await app.prisma.stock.findUnique({
        where: { id: parsed.data.stockId },
      });
      if (!stock) return fail(reply, 404, "股票不存在");

      // 把解析日期字符串转换成 Date 对象
      const date = new Date(parsed.data.date);

      const { stockId, ...rest } = parsed.data;

      const flow = await app.prisma.fundFlow.upsert({
        where: { stockId_date: { stockId, date } },
        update: {
          mainNet: rest.mainNet,
          mainNet5d: rest.mainNet5d ?? 0,
          mainNet10d: rest.mainNet10d ?? 0,
          superLargeNet: rest.superLargeNet ?? 0,
          largeNet: rest.largeNet ?? 0,
          mediumNet: rest.mediumNet ?? 0,
          smallNet: rest.smallNet ?? 0,
          mainNetRatio: rest.mainNetRatio ?? null,
          turnover: rest.turnover ?? null,
        },
        create: {
          stockId,
          date,
          mainNet: rest.mainNet,
          mainNet5d: rest.mainNet5d ?? 0,
          mainNet10d: rest.mainNet10d ?? 0,
          superLargeNet: rest.superLargeNet ?? 0,
          largeNet: rest.largeNet ?? 0,
          mediumNet: rest.mediumNet ?? 0,
          smallNet: rest.smallNet ?? 0,
          mainNetRatio: rest.mainNetRatio ?? null,
          turnover: rest.turnover ?? null,
        },
      });

      return ok(reply, toFundFlowDto(flow), "录入成功");
    },
  );

  // 2.批量录入
  app.post(
    "/fund-flow/batch",
    {
      preHandler: [app.authenticate],
      config: { rateLimit: { max: 20, timeWindow: "1 minute" } },
      schema: {
        tags: ["fund-flow"],
        summary: "批量录入资金流",
        security: [{ bearerAuth: [] }],
        body: {
          type: "object",
          properties: {
            stockId: { type: "string" },
            items: {
              type: "array",
              minItems: 1,
              maxItems: 1000,
            },
          },
          required: ["stockId", "items"],
        },
        response: {
          200: envelope({
            type: "object",
            properties: {
              created: { type: "number" },
              updated: { type: "number" },
              skipped: { type: "number" },
              errors: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    index: { type: "number" },
                    date: { type: "string" },
                    message: { type: "string" },
                  },
                },
              },
            },
            required: ["created", "updated", "skipped", "errors"],
          }),
        },
      },
    },
    async (req, reply) => {
      const parsed = BatchBody.safeParse(req.body);
      if (!parsed.success) return fail(reply, 400, "参数错误");

      const stock = await app.prisma.stock.findUnique({
        where: { id: parsed.data.stockId },
      });
      if (!stock) return fail(reply, 404, "股票不存在");

      let created = 0;
      let updated = 0;
      let skipped = 0;
      let errors: { index: number; date: string; message: string }[] = [];

      for (let i = 0; i < parsed.data.items.length; i += 1) {
        const item = parsed.data.items[i]!;

        try {
          const date = new Date(item.date);
          // before是查询日期是否存在，存在则更新，不存在则创建
          const before = await app.prisma.fundFlow.findUnique({
            where: { stockId_date: { stockId: parsed.data.stockId, date } },
          });

          await app.prisma.fundFlow.upsert({
            where: { stockId_date: { stockId: parsed.data.stockId, date } },
            update: {
              mainNet: item.mainNet,
              mainNet5d: item.mainNet5d ?? 0,
              mainNet10d: item.mainNet10d ?? 0,
              superLargeNet: item.superLargeNet ?? 0,
              largeNet: item.largeNet ?? 0,
              mediumNet: item.mediumNet ?? 0,
              smallNet: item.smallNet ?? 0,
              mainNetRatio: item.mainNetRatio ?? null,
              turnover: item.turnover ?? null,
            },
            create: {
              stockId: parsed.data.stockId,
              date,
              mainNet: item.mainNet,
              mainNet5d: item.mainNet5d ?? 0,
              mainNet10d: item.mainNet10d ?? 0,
              superLargeNet: item.superLargeNet ?? 0,
              largeNet: item.largeNet ?? 0,
              mediumNet: item.mediumNet ?? 0,
              smallNet: item.smallNet ?? 0,
              mainNetRatio: item.mainNetRatio ?? null,
              turnover: item.turnover ?? null,
            },
          });

          if (before) updated += 1;
          else created += 1;
        } catch (e) {
          skipped += 1;
          errors.push({
            index: i,
            date: item.date,
            message: e instanceof Error ? e.message : "未知错误",
          });
        }
      }

      return ok(reply, { created, updated, skipped, errors }, "批量录入成功");
    },
  );

  // 3.查询列表
  app.get(
    "/fund-flow",
    {
      schema: {
        tags: ["fund-flow"],
        summary: "按日期范围查询资金流",
        querystring: {
          type: "object",
          properties: {
            stockId: { type: "string" },
            from: { type: "string" },
            to: { type: "string" },
            page: { type: "integer", minimum: 1, default: 1 },
            pageSize: {
              type: "integer",
              minimum: 1,
              maximum: 500,
              default: 50,
            },
            order: { type: "string", enum: ["asc", "desc"], default: "desc" },
          },
          required: ["stockId"],
        },
        response: { 200: envelope(paginated(FundFlowData)) },
      },
    },
    async (req, reply) => {
      const q = QueryParams.parse(req.query);

      const where: Record<string, unknown> = { stockId: q.stockId };

      if (q.from || q.to) {
        where.date = {};

        // as Record<string, Date> 告诉编译器：“请把 where.date 当作一个键是字符串、值是 Date 类型的对象来处理”
        // .gte：访问上述对象中的 gte 属性（通常代表 "Greater Than or Equal"，即“大于等于”
        if (q.from) (where.date as Record<string, Date>).gte = new Date(q.from);
        if (q.to) (where.date as Record<string, Date>).lte = new Date(q.to);
      }

      const [list, total] = await Promise.all([
        app.prisma.fundFlow.findMany({
          where,
          orderBy: { date: q.order },
          skip: (q.page - 1) * q.pageSize,
          take: q.pageSize,
        }),
        app.prisma.fundFlow.count({ where }),
      ]);

      return ok(reply, {
        list: list.map(toFundFlowDto),
        total,
        page: q.page,
        pageSize: q.pageSize,
      });
    },
  );

  // 4.最新N条
  app.get(
    "/fund-flow/latest/:stockId",
    {
      schema: {
        tags: ["fund-flow"],
        summary: "获取最新N条资金流",
        params: {
          type: "object",
          properties: { stockId: { type: "string" } },
          required: ["stockId"],
        },
        querystring: {
          type: "object",
          properties: {
            limit: { type: "integer", minimum: 1, maximum: 500, default: 60 },
          },
        },
        response: {
          200: envelope({ type: "array", items: FundFlowData }),
        },
      },
    },
    async (req, reply) => {
      const { stockId } = req.params as { stockId: string };
      const { limit = 60 } = req.query as { limit?: number };
      const list = await app.prisma.fundFlow.findMany({
        where: { stockId },
        orderBy: { date: "desc" },
        take: limit,
      });

      return ok(reply, list.map(toFundFlowDto).reverse());
    },
  );

  // 5.资金流分析
  app.get(
    "/fund-flow/analysis/:stockId",
    {
      schema: {
        tags: ["fund-flow"],
        summary: "资金流洞察（连续净注入、强度评分）",
        params: {
          type: "object",
          properties: {
            stockId: { type: "string" },
          },
          required: ["stockId"],
        },
        response: {
          200: envelope({
            type: "object",
            properties: {
              latestDate: { type: ["string", "null"] },
              latestMainNet: { type: ["number", "null"] },
              latestMainNet5d: { type: ["number", "null"] },
              consecutivenInflowDays: { type: "number" },
            },
          }),
        },
      },
    },
    async (req, reply) => {
      // as是类型断言，它告诉 TypeScript 编译器：“我确信 req.params 在这个场景下就是一个包含 stockId 属性且值为 string 类型的对象
      const { stockId } = req.params as { stockId: string };

      const recent = await app.prisma.fundFlow.findMany({
        where: { stockId },
        orderBy: { date: "desc" },
        take: 20,
      });

      if (recent.length === 0) {
        return ok(reply, {
          latestDate: null,
          latestMainNet: null,
          latestMainNet5d: null,
          consecutiveInflowDays: 0,
          consecutiveOutflowDays: 0,
          inflowScore: 0,
          trend: "neutral", //中性
          recent5dNet: 0,
        });
      }

      const latest = recent[0]!;

      // 连续净注入/流出天数
      let inflowDays = 0;
      for (const f of recent) {
        if (f.mainNet > 0) inflowDays += 1;
        else break; //不连续时就退出
      }

      let outflowDays = 0;
      for (const f of recent) {
        if (f.mainNet < 0) outflowDays += 1;
        else break; //不连续时就退出
      }

      // 近5日主力净额合计
      const recent5d = recent.slice(0, 5);
      const recent5dNet = recent5d.reduce((sum, f) => sum + f.mainNet, 0);

      // 强度评分：基于连续天数 + 近5日净额趋势， 0-100
      // 乘以 15 是赋予其较高的权重。意味着连续流入天数越多，得分增长越快。例如，连续 3 天流入可得 45 分。
      // 乘以 5 是赋予其较低的权重，作为辅助加分项
      let score = 0;
      if (inflowDays > 0)
        score = Math.min(100, inflowDays * 15 + recent5d.length * 5);
      else if (outflowDays > 0) score = Math.max(0, 50 - outflowDays * 15);

      const trend: "bullish" | "bearish" | "neutral" =
        inflowDays >= 3 ? "bullish" : outflowDays >= 3 ? "bearish" : "neutral";

      return ok(reply, {
        latestDate: latest.date.toISOString(),
        latestMainNet: latest.mainNet,
        latestMainNet5d: latest.mainNet5d,
        consecutiveInflowDays: inflowDays,
        consecutiveOutflowDays: outflowDays,
        inflowScore: Math.round(score),
        trend,
        recent5dNet,
      });
    },
  );

  // 6.删除
  app.delete(
    "/fund-flow/:id",
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ["fund-flow"],
        summary: "删除资金流记录",
        security: [{ bearerAuth: [] }],
        params: {
          type: "object",
          properties: {
            id: { type: "string" },
          },
          required: ["id"],
        },
        response: {
          200: envelope({ type: "null" }),
          404: errorEnvelope,
        },
      },
    },
    async (req, reply) => {
      const { id } = IdParams.parse(req.params);
      const exists = await app.prisma.fundFlow.findUnique({
        where: { id },
      });

      if (!exists) return fail(reply, 404, "记录不存在");

      await app.prisma.fundFlow.delete({
        where: { id },
      });

      return ok(reply, null, "删除成功");
    },
  );
};

export default fundFlowRoutes;
