|主题 |约定
|Prisma Client 生成 |provider = "prisma-client" + output = "../generated/prisma" + importFileExtension = "js"
|SQLite 路径 |.env 里 DATABASE_URL="file:./prisma/dev.db"（基准是 prisma.config.ts 所在目录）
|pnpm 构建脚本 |用 pnpm-workspace.yaml 的 allowBuilds，better-sqlite3: true，其余按需
|tsconfig 结构 |主配置只管 src/，prisma.config.ts 不进 include，rootDir: "src"
