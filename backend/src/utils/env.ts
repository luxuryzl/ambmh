import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BACKEND_ROOT = path.resolve(__dirname, "../../");
dotenv.config({ path: path.resolve(BACKEND_ROOT, ".env") });

const EnvSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  HOST: z.string().default("0.0.0.0"),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace"])
    .default("info"),
  CORS_ORIGIN: z.string().default("http://localhost:3000"),
  JWT_SECRET: z
    .string()
    .min(16, "JWT_SECRET must be at least 16 characters long"),
  JWT_EXPIRES_IN: z.string().default("7d"),
  DATABASE_URL: z.string().min(1),
});

/**
 * parse()‌：如果校验失败，会直接‌抛出异常‌（throw Error），导致程序中断。需要使用 try/catch 块来捕获。
 * safeParse()‌：如果校验失败，‌不会抛出异常‌，而是返回一个包含错误信息的对象。
 * 这使得错误处理更加平滑，特别适合在启动阶段检查配置，避免因单个环境变量缺失导致整个应用崩溃
 * 或者用于需要优雅展示错误信息的场景。
 */
const parsed = EnvSchema.safeParse(process.env);
// parsed.success = true | false 成功是返回parsed.data，失败时返回parsed.error
if (!parsed.success) {
  const tree = z.treeifyError(parsed.error);
  console.error("环境变量校验失败");
  console.error(JSON.stringify(tree, null, 2)); //null表示‌不进行任何属性过滤或值替换；2表示每层缩进 2 个空格
  process.exit(1);
}

export const env = parsed.data;
export type Env = typeof env;

// 后面我们引用env的时候，就可以使用env.NODE_ENV了，有提示，有类型检查
