import { defineStore } from "pinia";
import { ref } from "vue";
import {
  fundFlowApi,
  type BatchResult,
  type FundFlow,
  type FundFlowInput,
  type FundFlowAnalysis,
} from "@/api/fund-flow";

export const useFundFlowStore = defineStore("fundFlow", () => {
  const list = ref<FundFlow[]>([]);
  const total = ref(0);
  const page = ref(1);
  const pageSize = ref(50);
  const loading = ref(false);
  const analysis = ref<FundFlowAnalysis | null>(null);

  async function fetchList(stockId: string, from?: string, to?: string) {
    loading.value = true;

    try {
      const res = await fundFlowApi.list({
        stockId,
        from,
        to,
        page: page.value,
        pageSize: pageSize.value,
        order: "desc",
      });
      list.value = res.list;
      total.value = res.total;
    } finally {
      loading.value = false;
    }
  }

  async function fetchAnalysis(stockId: string) {
    analysis.value = await fundFlowApi.analysis(stockId);
  }

  async function batchCreate(
    stockId: string,
    items: FundFlowInput[],
  ): Promise<BatchResult> {
    return fundFlowApi.batch(stockId, items);
  }

  async function create(
    stockId: string,
    payload: FundFlowInput,
  ): Promise<FundFlow> {
    return fundFlowApi.create({ stockId, ...payload });
  }

  async function remove(id: string, stockId: string) {
    await fundFlowApi.remove(id);
    await fetchList(stockId);
  }

  return {
    list,
    total,
    page,
    pageSize,
    loading,
    analysis,
    fetchList,
    fetchAnalysis,
    batchCreate,
    create,
    remove,
  };
});
