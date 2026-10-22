import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { ok, fail } from "../utils/reply.js";
import { EastMoneyDataSource } from "../datasources/eastmoney.js";

const quoteSource = new EastMoneyDataSource();
const flowSource = new EastMoneyDataSource();

const SyncParams = z.object({
  stockId: z.string().min(1), // 传我们数据库里的 uuid
});

const syncRoutes: FastifyPluginAsync = async (app) => {
  // 1.同步日线数据
  app.post(
    "/sync/quotes/:stockId",
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const { stockId } = SyncParams.parse(req.params);

      const stock = await app.prisma.stock.findUnique({
        where: { id: stockId },
      });

      if (!stock) return fail(reply, 404, "股票不存在");

      try {
        // 从腾讯财经获取最近120天的日线数据
        const remoteQuotes = await quoteSource.fetchQuote(
          stock.code,
          stock.market,
          120,
        );

        let created = 0;
        let updated = 0;

        // 写入数据库
        for (const q of remoteQuotes) {
          const date = new Date(q.date);

          const existing = await app.prisma.dailyQuote.findUnique({
            where: { stockId_date: { stockId, date } },
          });

          await app.prisma.dailyQuote.upsert({
            where: { stockId_date: { stockId, date } },
            update: {
              open: q.open,
              high: q.high,
              low: q.low,
              close: q.close,
              volume: q.volume,
              amount: q.amount,
              amplitude: q.amplitude,
              pctChange: q.pctChange,
              change: q.change,
              turnover: q.turnover,
            },
            create: {
              stockId,
              date,
              open: q.open,
              high: q.high,
              low: q.low,
              close: q.close,
              volume: q.volume,
              amount: q.amount,
              amplitude: q.amplitude,
              pctChange: q.pctChange,
              change: q.change,
              turnover: q.turnover,
            },
          });

          if (existing) updated++;
          else created++;
        }

        return ok(
          reply,
          { source: quoteSource.name, created, updated },
          "同步日线成功",
        );
      } catch (e) {
        app.log.error(e);
        return fail(
          reply,
          500,
          `同步失败：${e instanceof Error ? e.message : "未知错误"}`,
        );
      }
    },
  );

  //   2.同步资金流数据
  app.post(
    "/sync/fund-flow/:stockId",
    { preHandler: [app.authenticate] },
    async (req, reply) => {
      const { stockId } = SyncParams.parse(req.params);

      const stock = await app.prisma.stock.findUnique({
        where: { id: stockId },
      });

      if (!stock) return fail(reply, 404, "股票不存在");

      try {
        const remoteFlows = await flowSource.fetchFundFlow(
          stock.code,
          stock.market,
          60,
        );

        let created = 0;
        let updated = 0;

        for (const f of remoteFlows) {
          const date = new Date(f.date);
          const existing = await app.prisma.fundFlow.findUnique({
            where: { stockId_date: { stockId, date } },
          });

          await app.prisma.fundFlow.upsert({
            where: { stockId_date: { stockId, date } },
            update: {
              mainNet: f.mainNet,

              superLargeNet: f.superLargeNet,
              largeNet: f.largeNet,
              mediumNet: f.mediumNet,
              smallNet: f.smallNet,

              mainNetRatio: f.mainNetRatio,
            },
            create: {
              stockId,
              date,
              mainNet: f.mainNet,

              superLargeNet: f.superLargeNet,
              largeNet: f.largeNet,
              mediumNet: f.mediumNet,
              smallNet: f.smallNet,
              mainNetRatio: f.mainNetRatio,
            },
          });

          if (existing) updated++;
          else created++;
        }

        // 数据落库后，统一重新计算最近 120 天的 5日主力净额、10日主力净额
        // 取出该股票最近 120 天的所有数据，按日期正序排列（最早的在前面）
        const allFlows = await app.prisma.fundFlow.findMany({
          where: { stockId },
          orderBy: { date: "asc" },
          take: 120,
        });

        // 遍历并计算5日滑动窗口
        for (let i = 0; i < allFlows.length; i++) {
          let sum5d = 0;
          let sum10d = 0;
          let count = 0;
          let count10d = 0;
          // 往前推5天，包含当天
          for (let j = i; j >= 0 && count < 5; j--) {
            sum5d += allFlows[j]!.mainNet;
            count++;
          }

          // 往前推10天，包含当天
          for (let j = i; j >= 0 && count10d < 10; j--) {
            sum10d += allFlows[j]!.mainNet;
            count10d++;
          }

          // 更新这条记录的mainNet5d
          await app.prisma.fundFlow.update({
            where: { id: allFlows[i]!.id },
            data: {
              mainNet5d: sum5d,
              mainNet10d: sum10d,
            },
          });
        }

        return ok(
          reply,
          { source: flowSource.name, created, updated },
          "同步资金流成功，已自动计算5日主力净额",
        );
      } catch (e) {
        app.log.error(e);
        return fail(
          reply,
          500,
          `同步失败：${e instanceof Error ? e.message : "未知错误"}`,
        );
      }
    },
  );
};

export default syncRoutes;
