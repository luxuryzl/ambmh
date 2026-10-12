import {
  createRouter,
  createWebHistory,
  type RouteRecordRaw,
} from "vue-router";

import { useUserStore } from "@/stores/user";

const routes: RouteRecordRaw[] = [
  {
    path: "/login",
    name: "login",
    component: () => import("@/views/LoginView.vue"),
    meta: { title: "登录", public: true },
  },
  {
    path: "/",
    component: () => import("@/layouts/DefaultLayout.vue"),
    children: [
      {
        path: "",
        name: "dashboard",
        component: () => import("@/views/DashboardView.vue"),
        meta: { title: "驾驶舱" },
      },
      {
        path: "/stocks",
        name: "stocks",
        component: () => import("@/views/StockListView.vue"),
        meta: { title: "股票管理" },
      },
    ],
  },
  {
    path: "/:pathMatch(.*)*",
    name: "not-found",
    component: () => import("@/views/NotFoundView.vue"),
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// 添加路由拦截器
router.beforeEach(async (to) => {
  const userStore = useUserStore();

  if (to.meta.public) return true;

  if (!userStore.isLoggedIn) {
    return { path: "/login", query: { redirect: to.fullPath } };
  }

  if (userStore.user === null) {
    try {
      await userStore.fetchMe();
    } catch {
      userStore.logout();
      return { path: "/login" };
    }
  }

  return true;
});

router.afterEach((to) => {
  const title = (to.meta.title as string) ?? "";
  document.title = title ? `${title} · 股票投资管理系统` : "股票投资管理系统";
});

export default router;
