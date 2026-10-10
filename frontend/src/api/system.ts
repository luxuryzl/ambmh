import { http } from "./request";

// health响应结构
export interface HealthResp {
  status: string;
  uptime: number;
  now: string;
  version: string;
}

export interface PingResp {
  pong: boolean;
  ts: number; //timestamp 时间戳
}

export const systemApi = {
  health: () =>
    http<HealthResp>({
      url: "/health",
      method: "GET",
    }),
  ping: () =>
    http<PingResp>({
      url: "/ping",
      method: "GET",
    }),
};
