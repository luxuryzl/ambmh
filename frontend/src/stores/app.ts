import { defineStore } from "pinia";
import { ref } from "vue";
import { systemApi, type HealthResp } from "@/api/system";

export const useAppStore = defineStore("app", () => {
  const health = ref<HealthResp | null>(null);
  const loading = ref(false);
  const lastPing = ref<number | null>(null);

  async function fetchHealth() {
    loading.value = true;

    try {
      health.value = await systemApi.health();
    } finally {
      loading.value = false;
    }
  }

  async function ping() {
    const res = await systemApi.ping();
    lastPing.value = res?.ts ?? null;
  }

  return { health, loading, lastPing, fetchHealth, ping };
});
