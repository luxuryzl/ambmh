import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { ok, fail } from "../utils/reply.js";
import { envelope, errorEnvelope, paginated } from "../schemas/envelope.js";
import { StockData, MarketEnum } from "../schemas/stock.js";
import { toStockDto } from "../utils/transform.js";

// a.获取股票列表
const ListQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(20),
  keyword: z.string().optional(),
  market: z.enum(MarketEnum).optional(),
});

// b.创建股票
const CreateBody = z.object({
  code: z.string().min(1).max(16),
  name: z.string().min(1).max(64),
  market: z.enum(MarketEnum),
  industry: z.string().max(64).optional(),
  listDate: z.iso.date().nullable().optional(), //注意不是datetime，如果没有nullable()，则不能清空
});

// c.更新股票
const UpdateBody = CreateBody.partial().extend({
  isActive: z.boolean().optional(),
});

// d.获取股票
const IdParam = z.object({
  id: z.string().min(1),
});

// e.导入股票
const ImportBody = z.object({
  items: z.array(CreateBody).min(1).max(500),
});

// 股票操作的路由
const stockRoutes: FastifyPluginAsync = async (app) => {
  // 1.列表
  app.get(
    "/stocks",
    {
      schema: {
        tags: ["stock"],
        summary: "股票分页列表",
        querystring: {
          type: "object",
          properties: {
            page: { type: "integer", minimum: 1, default: 1 },
            pageSize: {
              type: "integer",
              minimum: 1,
              maximum: 200,
              default: 20,
            },
            keyword: { type: "string" },
            market: { type: "string", enum: MarketEnum as unknown as string[] },
            // 将一个 TypeScript 的常量数组（元组类型）强制转换为普通的字符串数组类型，以便符合 Schema 验证库对 enum 字段的类型要求
          },
        },
        response: {
          200: envelope(paginated(StockData)),
        },
      },
    },
    async (req, reply) => {
      const q = ListQuery.parse(req.query);

      const where: Record<string, unknown> = {};

      // 根据股票所属市场或关键字（股票代码/名称）进行过滤
      if (q.market) where.market = q.market;
      if (q.keyword) {
        where.OR = [
          { code: { contains: q.keyword } },
          { name: { contains: q.keyword } },
        ];
      }

      const [list, total] = await Promise.all([
        app.prisma.stock.findMany({
          where,
          orderBy: [{ market: "asc" }, { code: "asc" }],
          skip: (q.page - 1) * q.pageSize, //相当于 SQL 中的 OFFSET
          take: q.pageSize, //相当于 SQL 中的 LIMIT，我们定义的默认是1页20条，最大200条
        }),
        app.prisma.stock.count({ where }),
      ]);

      return ok(reply, {
        list: list.map(toStockDto),
        total,
        page: q.page,
        pageSize: q.pageSize,
      });
    },
  );

  // 2.详情
  app.get(
    "/stocks/:id",
    {
      schema: {
        tags: ["stock"],
        summary: "获取股票详情",
        params: {
          type: "object",
          properties: {
            id: { type: "string" },
          },
          required: ["id"],
        },
        response: {
          200: envelope(StockData),
          404: errorEnvelope,
        },
      },
    },
    async (req, reply) => {
      const { id } = IdParam.parse(req.params);
      const stock = await app.prisma.stock.findUnique({
        where: { id },
      });

      if (!stock) return fail(reply, 404, "股票不存在");

      return ok(reply, toStockDto(stock));
    },
  );

  // 3.创建
  app.post(
    "/stocks",
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ["stock"],
        summary: "新增股票",
        security: [{ bearerAuth: [] }],
        body: {
          type: "object",
          properties: {
            code: { type: "string" },
            name: { type: "string" },
            market: { type: "string", enum: MarketEnum as unknown as string[] },
            industry: { type: "string" },
            listDate: { type: "string" },
          },
          required: ["code", "name", "market"],
        },
        response: {
          200: envelope(StockData),
          400: errorEnvelope,
          409: errorEnvelope,
        },
      },
    },
    async (req, reply) => {
      const parsed = CreateBody.safeParse(req.body);

      if (!parsed.success)
        return fail(reply, 400, parsed.error.issues[0]?.message ?? "参数错误");

      const exists = await app.prisma.stock.findUnique({
        where: { code: parsed.data.code },
      });

      if (exists)
        return fail(reply, 409, `股票代码 ${parsed.data.code} 已存在`);

      // listDate指股票的上市日期（首次公开发行、在交易所挂牌交易的日期）
      const stock = await app.prisma.stock.create({
        data: {
          code: parsed.data.code,
          name: parsed.data.name,
          market: parsed.data.market,
          industry: parsed.data.industry ?? null,
          listDate: parsed.data.listDate
            ? new Date(parsed.data.listDate)
            : null,
        },
      });

      return ok(reply, toStockDto(stock), "股票添加成功");
    },
  );

  // 4.更新
  app.patch(
    "/stocks/:id",
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ["stock"],
        summary: "更新股票信息",
        security: [{ bearerAuth: [] }],
        params: {
          type: "object",
          properties: { id: { type: "string" } },
          required: ["id"],
        },
        body: {
          type: "object",
          properties: {
            name: { type: "string" },
            market: { type: "string", enum: MarketEnum as unknown as string[] },
            industry: { type: ["string", "null"] },
            listDate: { type: ["string", "null"] },
            isActive: { type: "boolean" },
          },
        },
        response: {
          200: envelope(StockData),
          400: errorEnvelope,
          404: errorEnvelope,
        },
      },
    },
    async (req, reply) => {
      const { id } = IdParam.parse(req.params);
      const parsed = UpdateBody.safeParse(req.body);
      if (!parsed.success) return fail(reply, 400, "参数错误");

      const exists = await app.prisma.stock.findUnique({ where: { id } });
      if (!exists) return fail(reply, 404, "股票不存在");

      const data: Record<string, unknown> = {};

      if (parsed.data.name !== undefined) data.name = parsed.data.name;
      if (parsed.data.market !== undefined) data.market = parsed.data.market;
      if (parsed.data.industry !== undefined)
        data.industry = parsed.data.industry;
      if (parsed.data.listDate !== undefined) {
        data.listDate = parsed.data.listDate
          ? new Date(parsed.data.listDate)
          : null;
      }
      if (parsed.data.isActive !== undefined)
        data.isActive = parsed.data.isActive;

      const updated = await app.prisma.stock.update({
        where: { id },
        data,
      });

      return ok(reply, toStockDto(updated), "更新成功");
    },
  );

  // 5.删除
  app.delete(
    "/stocks/:id",
    {
      preHandler: [app.authenticate],
      schema: {
        tags: ["stock"],
        summary: "删除股票",
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
      const { id } = IdParam.parse(req.params);
      const exists = await app.prisma.stock.findUnique({
        where: { id },
      });
      if (!exists) return fail(reply, 404, "股票不存在");

      await app.prisma.stock.delete({
        where: { id },
      });

      // 这个地方不能用ok，因为返回值是null
      return reply.send({
        code: 0,
        msg: "删除成功",
        data: null,
      });
    },
  );

  // 6.批量导入
  app.post(
    "/stocks/import",
    {
      preHandler: [app.authenticate],
      config: { rateLimit: { max: 10, timeWindow: "1 minute" } },
      schema: {
        tags: ["stock"],
        summary: "批量导入股票",
        securyty: [{ bearerAuth: [] }],
        body: {
          type: "object",
          properties: {
            items: {
              type: "array",
              minItems: 1,
              maxItems: 500,
              items: {
                type: "object",
                properties: {
                  code: { type: "string" },
                  name: { type: "string" },
                  market: {
                    type: "string",
                    enum: MarketEnum as unknown as string[],
                  },
                  industry: { type: "string" },
                  listDate: { type: "string" },
                },
                required: ["code", "name", "market"],
              },
            },
          },
          required: ["items"],
        },
        response: {
          200: envelope({
            type: "object",
            properties: {
              created: { type: "number" },
              updated: { type: "number" },
              skipped: { type: "number" },
            },
            required: ["created", "updated", "skipped"],
          }),
        },
      },
    },
    async (req, reply) => {
      const parsed = ImportBody.safeParse(req.body);

      if (!parsed.success) return fail(reply, 400, "参数错误");

      let created = 0;
      let updated = 0;
      let skipped = 0;

      for (const item of parsed.data.items) {
        try {
          const exists = await app.prisma.stock.findUnique({
            where: { code: item.code },
          });

          if (exists) {
            // 已存在则更新
            await app.prisma.stock.update({
              where: { id: exists.id },
              data: {
                name: item.name,
                market: item.market,
                industry: item.industry ?? exists.industry,
                listDate: item.listDate
                  ? new Date(item.listDate)
                  : exists.listDate,
              },
            });
            updated += 1;
          } else {
            await app.prisma.stock.create({
              data: {
                code: item.code,
                name: item.name,
                market: item.market,
                industry: item.industry ?? null,
                listDate: item.listDate ? new Date(item.listDate) : null,
              },
            });
            created += 1;
          }
        } catch {
          skipped += 1;
        }
      }

      return ok(reply, { created, updated, skipped }, "导入完成");
    },
  );
};

export default stockRoutes;
