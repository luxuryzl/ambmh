import { defineStore } from "pinia";
import { ref } from "vue";
import {
  stockApi,
  type ListParams,
  type Market,
  type Stock,
  type StockUpsertPayload,
} from "@/api/stock";

export const useStockStore = defineStore("stock", () => {
  const list = ref<Stock[]>([]);
  const total = ref(0);
  const page = ref(1);
  const pageSize = ref(20);
  const keyword = ref("");
  const market = ref<Market | "">("");
  const loading = ref(false);

  async function fetchList(params: ListParams = {}) {
    loading.value = true;

    try {
      const res = await stockApi.list({
        page: page.value,
        pageSize: pageSize.value,
        keyword: keyword.value || undefined,
        market: market.value || undefined,
        ...params,
      });

      list.value = res.list;
      total.value = res.total;
      page.value = res.page;
      pageSize.value = res.pageSize;
    } finally {
      loading.value = false;
    }
  }

  async function create(payload: StockUpsertPayload) {
    await stockApi.create(payload);
    await fetchList();
  }

  async function update(
    id: string,
    payload: Partial<StockUpsertPayload> & { isActive?: boolean },
  ) {
    await stockApi.update(id, payload);
    await fetchList();
  }

  async function remove(id: string) {
    await stockApi.remove(id);
    await fetchList();
  }

  function reset() {
    keyword.value = "";
    market.value = "";
    page.value = 1;
    void fetchList();
  }

  async function importItems(items: StockUpsertPayload[]) {
    const res = await stockApi.import(items);
    await fetchList();
    return res;
  }

  return {
    list,
    total,
    page,
    pageSize,
    keyword,
    market,
    loading,
    fetchList,
    create,
    update,
    remove,
    reset,
    importItems,
  };
});
