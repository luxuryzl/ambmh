import { http } from "./request";

export interface AuthUser {
  id: string;
  username: string;
  nickname: string | null;
  createdAt: string;
}

export interface LoginResp {
  token: string;
  user: AuthUser;
}

export interface RegisterPayload {
  username: string;
  password: string;
  nickname?: string | null;
}

export const authApi = {
  register: (p: RegisterPayload) =>
    http<AuthUser>({ url: "/auth/register", method: "POST", data: p }),

  login: (username: string, password: string) =>
    http<LoginResp>({
      url: "/auth/login",
      method: "POST",
      data: { username, password },
    }),

  me: () => http<AuthUser>({ url: "/auth/me", method: "GET" }),
};
