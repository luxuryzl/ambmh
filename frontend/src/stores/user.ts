import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { authApi, type AuthUser } from "@/api/auth";

import {
  getToken,
  setToken as persistToken,
  clearToken,
} from "@/utils/storage";

export const useUserStore = defineStore("user", () => {
  const token = ref<string | null>(getToken());
  const user = ref<AuthUser | null>(null);

  const isLoggedIn = computed(() => token.value !== null);

  function setToken(t: string | null) {
    token.value = t;
    persistToken(t);
  }

  async function login(username: string, password: string) {
    const res = await authApi.login(username, password);
    setToken(res.token);
    user.value = res.user;
  }

  async function fetchMe() {
    if (token.value === null) return;
    user.value = await authApi.me();
  }

  function logout() {
    token.value = null;
    user.value = null;
    clearToken();
  }

  return { token, user, isLoggedIn, setToken, login, fetchMe, logout };
});
