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
        <div class="right">v0.1.0</div>
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
import { useRoute } from "vue-router";
import {
  Monitor,
  DataLine,
  TrendCharts,
  Notebook,
} from "@element-plus/icons-vue";

const route = useRoute();
const activeMenu = computed(() => route.path);

const menus = [{ path: "/", title: "驾驶舱", icon: Monitor }];
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
}
.title {
  font-weight: 600;
}
.right {
  color: #94a3b8;
  font-size: 12px;
}
.main {
  background: #f5f7fa;
}
</style>
