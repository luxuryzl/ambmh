<template>
  <div class="dashboard">
    <el-row :gutter="16">
      <el-col :span="8">
        <el-card shadow="hover">
          <template #header>后端状态</template>
          <div v-if="appStore.loading">加载中…</div>
          <div v-else-if="appStore.health">
            <el-tag type="success">{{ appStore.health.status }}</el-tag>
            <p>版本：{{ appStore.health.version }}</p>
            <p>运行时长：{{ appStore.health.uptime }} 秒</p>
          </div>
          <div v-else>无法连接后端</div>
        </el-card>
      </el-col>

      <el-col :span="8">
        <el-card shadow="hover">
          <template #header>接口连通性</template>
          <el-button type="primary" @click="handlePing">调用 /ping</el-button>
          <p v-if="appStore.lastPing" style="margin-top: 12px">
            最近响应：{{ formattedLastPing }}
          </p>
        </el-card>
      </el-col>

      <el-col :span="8">
        <el-card shadow="hover">
          <template #header>里程碑</template>
          <p>✅ 阶段 1：脚手架与基础设施</p>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from "vue";
import { ElMessage } from "element-plus";
import { useAppStore } from "@/stores/app";

const appStore = useAppStore();

onMounted(async () => {
  await appStore.fetchHealth();
});

// 用computed派生，null有明确出口
const formattedLastPing = computed(() => {
  const ts = appStore.lastPing;
  return ts === null ? "-" : new Date(ts).toLocaleTimeString();
});
async function handlePing() {
  await appStore.ping();
  const ts = appStore.lastPing;
  if (ts === null) return;
  ElMessage.success(`Ping 成功: ${new Date(ts).toLocaleTimeString()}`);
}
</script>

<style scoped>
.dashboard {
  padding: 8px;
}
</style>
