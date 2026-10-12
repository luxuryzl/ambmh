<template>
  <el-container class="layout">
    <el-aside width="200px" class="aside">
      <div class="logo">📈 StockSystem</div>
      <el-menu :default-active="activeMenu" router class="menu">
        <el-menu-item v-for="m in menus" :key="m.path" :index="m.path">
          <el-icon><component :is="m.icon" /></el-icon>
          <span>{{ m.title }}</span>
        </el-menu-item>
      </el-menu>
    </el-aside>

    <el-container>
      <el-header class="header">
        <div class="title">{{ route.meta.title ?? "首页" }}</div>

        <div class="right">
          <el-dropdown trigger="click" @command="onCommand">
            <div class="user-trigger">
              <div class="avatar">{{ avatarText }}</div>
              <span class="uname">{{ displayName }}</span>
              <el-icon class="arrow"><ArrowDown /></el-icon>
            </div>

            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="profile" :icon="User" disabled>
                  个人中心
                </el-dropdown-item>
                <el-dropdown-item command="logout" :icon="SwitchButton" divided>
                  退出登录
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>

      <el-main class="main">
        <router-view v-slot="{ Component }">
          <component :is="Component" />
        </router-view>
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";
import {
  Monitor,
  Files,
  DataLine,
  TrendCharts,
  Notebook,
  User,
  SwitchButton,
  ArrowDown,
} from "@element-plus/icons-vue";
import { useUserStore } from "@/stores/user";

const route = useRoute();
const router = useRouter();
const userStore = useUserStore();
const activeMenu = computed(() => route.path);

const menus = [
  { path: "/", title: "驾驶舱", icon: Monitor },
  { path: "/stocks", title: "股票管理", icon: Files },
];

const displayName = computed(
  () => userStore.user?.nickname ?? userStore.user?.username ?? "未登录",
);

const avatarText = computed(() => {
  const name = displayName.value;
  return name ? name.charAt(0).toUpperCase() : "?";
});
async function onLogout() {
  try {
    await ElMessageBox.confirm("确定要退出登录吗？", "提示", {
      confirmButtonText: "退出",
      cancelButtonText: "取消",
      type: "warning",
    });
  } catch {
    return;
  }
  userStore.logout();
  ElMessage.success("退出登录成功");
  router.push("/login");
}

function onCommand(cmd: string) {
  if (cmd === "logout") void onLogout();
  // 后续可以扩展profile settings等
}
</script>

<style scoped>
.layout {
  height: 100vh;
}

.aside {
  background: #1f2937;
  color: #fff;
  display: flex;
  flex-direction: column;
}
.logo {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  letter-spacing: 1px;
  border-bottom: 1px solid #374151;
}
.menu {
  flex: 1;
  background: transparent;
  border-right: none;
}
.menu :deep(.el-menu-item) {
  color: #cbd5e1;
}
.menu :deep(.el-menu-item.is-active) {
  color: #fff;
  background: #111827;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--el-border-color-light);
  background: #fff;
  padding: 0 20px;
}
.title {
  font-weight: 600;
  font-size: 16px;
}

.right {
  display: flex;
  align-items: center;
}

.user-trigger {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border-radius: 6px;
  cursor: pointer;
  transition: background-color 0.2s;
  outline: none;
}
.user-trigger:hover {
  background-color: var(--el-fill-color-light);
}

.avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: linear-gradient(135deg, #409eff, #66b1ff);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  font-size: 14px;
  user-select: none;
}

.uname {
  font-size: 14px;
  line-height: 1.5;
  color: var(--el-text-color-primary);
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  display: inline-block;
  vertical-align: middle;
}

.arrow {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  transition: transform 0.2s;
}
.user-trigger:hover .arrow {
  transform: rotate(180deg);
}

.main {
  background: #f5f7fa;
}
</style>
