import {
  createRouter,
  createWebHistory,
  type RouteRecordRaw,
} from "vue-router";

const routes: RouteRecordRaw[] = [
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

router.afterEach((to) => {
  const title = (to.meta.title as string) ?? "";
  document.title = title ? `${title} · 股票投资管理系统` : "股票投资管理系统";
});

export default router;
