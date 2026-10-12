import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { ok, fail } from "../utils/reply.js";
import { envelope, errorEnvelope, paginated } from "../schemas/envelope.js";
import { QuoteData } from "../schemas/quote.js";
import { toQuoteDto } from "../utils/transform.js";

// 获取指定股票指定日期的行情数据结构
const QuoteBody = z.object({
  stockId: z.string().min(1),
  date: z.iso.date(),
  open: z.number(),
  high: z.number(),
  low: z.number(),
  close: z.number(),
  volume: z.number().nonnegative(), // 非负数，包含0
  amount: z.number().nonnegative().optional(),
  pctChange: z.number().optional(),
  turnover: z.number().optional(),
});

// 批量获取股票指定日期的行情数据结构
const BatchBody = z.object({
  stockId: z.string().min(1),
  items: z
    .array(
      z.object({
        date: z.iso.date(),
        open: z.number(),
        high: z.number(),
        low: z.number(),
        close: z.number(),
        volume: z.number().nonnegative(), // 非负数，包含0
        amount: z.number().nonnegative().optional(),
        pctChange: z.number().optional(),
        turnover: z.number().optional(),
      }),
    )
    .min(1)
    .max(1000),
});

// 获取股票行情
const QueryParams = z.object({
  stockId: z.string().min(1),
  from: z.iso.date().optional(),
  to: z.iso.date().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(500).default(50),
  order: z.enum(["asc", "desc"]).default("desc"),
});

const IdParams = z.object({
  id: z.string().min(1),
});

const quoteRoutes: FastifyPluginAsync = async (app) => {
  // 1.单条录入
  app.post(
    "/quotes",
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ["quote"],
        summary: "录入单条日线数据",
        securyty: [{ bearerAuth: [] }],
        body: {
          type: "object",
          properties: {
            stockId: { type: "string" },
            date: { type: "string" },
            open: { type: "number" },
            high: { type: "number" },
            low: { type: "number" },
            close: { type: "number" },
            volume: { type: "number" },
            amount: { type: "number" },
            pctChange: { type: "number" },
            turnover: { type: "number" },
          },
          required: [
            "stockId",
            "date",
            "open",
            "high",
            "low",
            "close",
            "volume",
          ],
        },
        response: {
          200: envelope(QuoteData),
          400: errorEnvelope,
          404: errorEnvelope,
        },
      },
    },
    async (req, reply) => {
      const parsed = QuoteBody.safeParse(req.body);

      if (!parsed.success)
        return fail(reply, 400, parsed.error.issues[0]?.message ?? "参数错误");

      const stock = await app.prisma.stock.findUnique({
        where: { id: parsed.data.stockId },
      });

      if (!stock) return fail(reply, 404, "股票不存在");

      const date = new Date(parsed.data.date);

      const quote = await app.prisma.dailyQuote.upsert({
        where: { stockId_date: { stockId: parsed.data.stockId, date } },
        update: {
          open: parsed.data.open,
          high: parsed.data.high,
          low: parsed.data.low,
          close: parsed.data.close,
          volume: parsed.data.volume,
          amount: parsed.data.amount ?? null,
          pctChange: parsed.data.pctChange ?? null,
          turnover: parsed.data.turnover ?? null,
        },
        create: {
          stockId: parsed.data.stockId,
          date,
          open: parsed.data.open,
          high: parsed.data.high,
          low: parsed.data.low,
          close: parsed.data.close,
          volume: parsed.data.volume,
          amount: parsed.data.amount ?? null,
          pctChange: parsed.data.pctChange ?? null,
          turnover: parsed.data.turnover ?? null,
        },
      });

      return ok(reply, toQuoteDto(quote), "录入成功");
    },
  );

  // 2.批量录入
  app.post(
    "/quotes/batch",
    {
      preHandler: [app.authenticate],
      config: { rateLimit: { max: 20, timeWindow: "1 minute" } },
      schema: {
        tags: ["quote"],
        summary: "批量录入股票日线数据，自动去重更新",
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
          const exists = await app.prisma.dailyQuote.findUnique({
            where: { stockId_date: { stockId: parsed.data.stockId, date } },
          });

          if (exists) {
            // 存在则更新
            await app.prisma.dailyQuote.update({
              where: { stockId_date: { stockId: parsed.data.stockId, date } },
              data: {
                open: item.open,
                high: item.high,
                low: item.low,
                close: item.close,
                volume: item.volume,
                amount: item.amount ?? exists.amount,
                pctChange: item.pctChange ?? exists.pctChange,
                turnover: item.turnover ?? exists.turnover,
              },
            });
            // 更新次数加1
            updated += 1;
          } else {
            // 不存在则创建
            await app.prisma.dailyQuote.create({
              data: {
                stockId: parsed.data.stockId,
                date,
                open: item.open,
                high: item.high,
                low: item.low,
                close: item.close,
                volume: item.volume,
                amount: item.amount ?? null,
                pctChange: item.pctChange ?? null,
                turnover: item.turnover ?? null,
              },
            });
            // 创建计数加1
            created += 1;
          }
        } catch (e) {
          // 跳过次数加1
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
    "/quotes",
    {
      schema: {
        tags: ["quote"],
        summary: "按日期范围查询日线",
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
        response: { 200: envelope(paginated(QuoteData)) },
      },
    },
    async (req, reply) => {
      const q = QueryParams.parse(req.query);
      const where: Record<string, unknown> = { stockId: q.stockId };
      if (q.from || q.to) {
        where.date = {};
        if (q.from) (where.date as Record<string, Date>).gte = new Date(q.from);
        if (q.to) (where.date as Record<string, Date>).lte = new Date(q.to);
      }

      const [list, total] = await Promise.all([
        app.prisma.dailyQuote.findMany({
          where,
          orderBy: { date: q.order },
          skip: (q.page - 1) * q.pageSize,
          take: q.pageSize,
        }),
        app.prisma.dailyQuote.count({ where }),
      ]);

      return ok(reply, {
        list: list.map(toQuoteDto),
        total,
        page: q.page,
        pageSize: q.pageSize,
      });
    },
  );

  // 4.最新N条，用于图表
  app.get(
    "/quotes/latest/:stockId",
    {
      schema: {
        tags: ["quote"],
        summary: "取最新N条日线数据",
        params: {
          type: "object",
          properties: {
            stockId: { type: "string" },
          },
          required: ["stockId"],
        },
        querystring: {
          type: "object",
          properties: {
            limit: { type: "integer", minimum: 1, maximum: 500, default: 60 },
          },
        },
        response: {
          200: envelope({ type: "array", items: QuoteData }),
        },
      },
    },
    async (req, reply) => {
      const { stockId } = req.params as { stockId: string };
      const { limit = 60 } = req.query as { limit: number };
      const list = await app.prisma.dailyQuote.findMany({
        where: { stockId },
        orderBy: { date: "desc" },
        take: limit,
      });
      // 返回按时间一点正序
      return ok(reply, list.map(toQuoteDto).reverse());
    },
  );

  // 5.删除
  app.delete(
    "/quotes/:id",
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ["quote"],
        summary: "删除日线数据",
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
      const exists = await app.prisma.dailyQuote.findUnique({
        where: { id },
      });
      if (!exists) return fail(reply, 404, "股票记录不存在");
      await app.prisma.dailyQuote.delete({
        where: { id },
      });
      return ok(reply, null, "删除成功");
    },
  );
};

export default quoteRoutes;
