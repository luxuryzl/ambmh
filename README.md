|主题 |约定
|Prisma Client 生成 |provider = "prisma-client" + output = "../generated/prisma" + importFileExtension = "js"
|SQLite 路径 |.env 里 DATABASE_URL="file:./prisma/dev.db"（基准是 prisma.config.ts 所在目录）
|pnpm 构建脚本 |用 pnpm-workspace.yaml 的 allowBuilds，better-sqlite3: true，其余按需
|tsconfig 结构 |主配置只管 src/，prisma.config.ts 不进 include，rootDir: "src"
|相对路径风险‌：得到的 ./prisma/dev.db 是一个‌相对路径‌。在 Node.js 中，相对路径是相对于‌当前工作目录‌（即你运行 node 或 npm start 命令时的目录）解析的，而不是相对于代码文件所在的目录。‌最佳实践建议‌：为了避免因运行目录不同导致找不到数据库文件，通常建议使用 path.resolve() 将其转换为绝对路径
