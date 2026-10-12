import { defineStore } from "pinia";
import { ref } from "vue";
import {
  quoteApi,
  type BatchResult,
  type DailyQuote,
  type QuoteInput,
} from "@/api/quote";

export const useQuoteStore = defineStore("quote", () => {
  const list = ref<DailyQuote[]>([]);
  const total = ref(0);
  const page = ref(1);
  const pageSize = ref(50);
  const loading = ref(false);

  async function fetchList(stockId: string, from?: string, to?: string) {
    loading.value = true;

    try {
      const res = await quoteApi.list({
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

  async function batchCreate(
    stockId: string,
    items: QuoteInput[],
  ): Promise<BatchResult> {
    return quoteApi.batch(stockId, items);
  }

  async function remove(id: string, stockId: string) {
    await quoteApi.remove(id);
    await fetchList(stockId);
  }

  return {
    list,
    total,
    page,
    pageSize,
    loading,
    fetchList,
    batchCreate,
    remove,
  };
});
