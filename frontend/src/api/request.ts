import axios, { type AxiosInstance, type AxiosRequestConfig } from "axios";
import axiosRetry from "axios-retry";
import { ElMessage } from "element-plus";
import { clearToken, getToken, setToken } from "../utils/storage";

// unknown（安全的未知）,含义‌：“我知道这里有个值，但我现在不知道它是什么类型，‌在使用前必须验证‌。”
// any（危险的逃逸舱）‌,含义‌：“我放弃类型检查，你可以对它做任何事。”
export interface ApiResponse<T = unknown> {
  code: number;
  msg: string;
  data: T | null;
}

// 区分401是否是token失效，还是登录失败,定义了一个数组，存放所有不需要身份验证即可访问的路径
const AUTH_FREE_URL = ["/auth/login", "/auth/register"];

function isAuthFree(url: string | undefined): boolean {
  if (!url) return false;
  return AUTH_FREE_URL.some((u) => url.includes(u));
  //some() 方法会遍历数组中的每一个元素,对‌任意一个元素返回 true，结果返回true
  // includes检查当前请求的完整 URL 字符串中‌是否包含‌这个白名单路径片段
}

// 创建 一个独立的axios 实例
const instance: AxiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL, //设置api的基础url
  timeout: 15000, //超时时间15秒
  headers: { "Content-Type": "application/json" }, //默认请求头为json
});

// 配置自动重试策略，将 axios-retry 插件绑定到上述 instance 上，定义失败后的行为。
axiosRetry(instance, {
  retries: 2, //最大重试次数为2
  retryDelay: (count) => count * 300, //延迟策略，线性递增，第1次300ms，第2次600ms，依次类推。

  //重试的触发条件，只有当函数返回 true 时才会重试
  //   1. ‌网络错误或幂等请求错误‌：网络断开、DNS 解析失败，以及 GET/HEAD/OPTIONS 等幂等方法的特定错误
  //   2. ‌服务器内部错误‌：如果服务器返回 5xx 状态码（如 500, 502, 503, 504），说明是服务端临时故障，值得重试。
  retryCondition: (err) =>
    axiosRetry.isNetworkOrIdempotentRequestError(err) ||
    (err.response?.status ?? 0) >= 500,
});

// 请求拦截器
instance.interceptors.request.use((config) => {
  const token = getToken();
  if (token !== null) {
    config.headers = config.headers ?? {}; //Axios 的 config 对象在某些极端情况或自定义配置下，headers 属性可能是 undefined 或 null
    // 添加 token 到请求头
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 响应拦截器
instance.interceptors.response.use(
  (resp) => {
    // 业务层错误：http状态码200，但code !==0 的错误
    const body = resp.data;
    if (body && typeof body.code === "number" && body.code !== 0) {
      ElMessage.error(body.msg || "请求失败");

      // 在 Axios 的响应拦截器中，使用 return Promise.reject(...) 的核心目的是‌中断正常的响应处理流程，并将错误状态传递给调用方的 .catch() 或 try...catch 块‌。
      return Promise.reject(new Error(body.msg));
    }

    return resp;
  },
  (err) => {
    // HTTP层错误：4XX,5XX 或 网络断开
    const status = err.response?.status;
    const url = err.config?.url;
    const msg =
      err.response?.data?.msg ?? err.message ?? "网络异常，请稍后重试";

    if (status === 401 && !isAuthFree(url)) {
      clearToken();
      if (!location.pathname.startsWith("/login")) {
        location.href = "/login";
      }
      ElMessage.error("登录已过期，请重新登录");
      // 跳转登录页
    } else if (status !== 400) {
      // 400参数错误通常需要组件自己处理业务逻辑，其他的全局弹窗
      ElMessage.error(msg);
    }

    return Promise.reject(err);
  },
);

// 请求方法
/**
 * <T = unknown>‌: 定义了一个泛型 T，默认值为 unknown。定义‌类型参数‌（给编译器看，用于类型检查）
 * (config: ...)‌：定义‌函数参数‌（给运行时看，用于传递实际数据）
 * 调用者可以指定期望返回的数据类型（如 http<User>({...})）
 * 使用之前创建的 Axios 实例（包含重试、基础 URL等配置）
 */
export async function http<T = unknown>(
  config: AxiosRequestConfig,
): Promise<T> {
  // 发起请求，并告诉 TS 期望的响应结构是 ApiResponse<T>
  const response = await instance.request<ApiResponse<T>>(config);
  // response.data.data是后端自定义的业务数据字段，我们真正想要的内容
  return response.data.data as T;
}

export default instance;
