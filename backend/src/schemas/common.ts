import { z } from "zod";

/**
 * 定义一套标准化的 API 响应数据结构（Schema）及其对应的 TypeScript 类型
 * 例如，如果你要验证用户信息，这里会传入 UserSchema
 * const UserSchema = z.object({ id: z.number(), name: z.string() });
 * const UserResponseSchema = ApiResponse(UserSchema);
 */

// API的响应结构，用于动态生成针对特定业务数据的响应验证器
// 运行时‌：使用 ApiResponse(UserSchema).parse(responseData) 可以确保从服务器拿到的数据确实符合预期结构，防止因后端字段变更导致前端崩溃
export const ApiResponse = <T extends z.ZodType>(dataSchema: T) =>
  z.object({
    code: z.number().default(0),
    msg: z.string().default("ok"),
    data: dataSchema.nullable(), //它复用传入的 dataSchema，成功时返回具体数据，失败或无数据时返回 null
  });

// 错误响应结构，定义一个固定的、用于验证‌错误响应‌的 Zod 模式，这有助于确保后端错误格式的统一性
export const ErrorResponse = z.object({
  code: z.number(),
  msg: z.string(),
  data: z.null(),
});

// 编译时‌：使用 ApiResponseShape<User> 可以让 TypeScript 在编写代码时提示 data.id 是否存在，提供智能补全。
export type ApiResponseShape<T> = {
  code: number;
  msg: string;
  data: T | null;
};
