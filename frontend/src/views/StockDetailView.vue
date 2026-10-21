<template>
  <div class="stock-detail">
    <el-card shadow="never">
      <template #header>
        <div class="header">
          <div class="header-left">
            <span class="title">{{ title }}</span>
            <el-tag v-if="stock" size="small" style="margin-left: 8px">{{
              stock.market
            }}</el-tag>
          </div>
          <div class="header-right">
            <el-button
              type="primary"
              :icon="Upload"
              @click="importVisible = true"
            >
              批量录入
            </el-button>
            <el-button type="success" :icon="Plus" @click="openSingle"
              >单条录入</el-button
            >
            <el-button
              type="danger"
              :icon="TrendCharts"
              @click="$router.push(`/stocks/${stockId}/fund-flow`)"
            >
              资金流
            </el-button>
          </div>
        </div>
      </template>

      <!-- 查询工具栏 -->
      <div class="toolbar">
        <el-date-picker
          v-model="range.from"
          type="date"
          value-format="YYYY-MM-DD"
          placeholder="开始日期"
        />
        <span>至</span>
        <el-date-picker
          v-model="range.to"
          type="date"
          value-format="YYYY-MM-DD"
          placeholder="结束日期"
        />
        <el-button
          type="primary"
          @click="
            () => {
              if (stockId) loadQuotes(stockId, range.from, range.to);
            }
          "
          >查询</el-button
        >
        <el-button
          :icon="Refresh"
          @click="
            () => {
              range.from = '';
              range.to = '';
              if (stockId) loadQuotes(stockId, range.from, range.to);
            }
          "
        >
          重置
        </el-button>
      </div>
      <!-- 图表 -->
      <el-card shadow="never" style="margin-bottom: 16px">
        <template #header>
          <span>K 线（近 120 个交易日）</span>
        </template>
        <BaseChart
          :option="klineOption"
          height="520px"
          :loading="klineLoading"
        />
      </el-card>
      <!-- 日数据显示列表 -->
      <el-table :data="quoteStore.list" v-loading="listLoading" stripe>
        <el-table-column label="日期" width="120">
          <template #default="{ row }">{{ row.date.slice(0, 10) }}</template>
        </el-table-column>
        <el-table-column prop="open" label="开盘" width="100" />
        <el-table-column prop="high" label="最高" width="100" />
        <el-table-column prop="low" label="最低" width="100" />
        <el-table-column prop="close" label="收盘" width="100" />
        <el-table-column label="成交量" width="100">
          <template #default="{ row }">{{ formatVolume(row.volume) }}</template>
        </el-table-column>
        <el-table-column label="成交额" width="100">
          <template #default="{ row }">{{ formatAmount(row.amount) }}</template>
        </el-table-column>
        <el-table-column label="涨幅" width="100">
          <template #default="{ row }">
            <span :class="row.pctChange >= 0 ? 'up' : 'down'">
              {{ row.pctChange != null ? `${row.pctChange.toFixed(2)}%` : "—" }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="换手率" width="100">
          <template #default="{ row }">{{
            row.turnover != null ? `${row.turnover.toFixed(2)}%` : "—"
          }}</template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" :icon="Edit" @click="openEdit(row)"
              >编辑</el-button
            >
            <el-button link type="danger" :icon="Delete" @click="onDelete(row)"
              >删除</el-button
            >
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        style="margin-top: 16px; justify-content: flex-end"
        layout="total, sizes, prev, pager, next"
        :total="quoteStore.total"
        :current-page="quoteStore.page"
        :page-size="quoteStore.pageSize"
        :page-sizes="[10, 20, 50, 100, 200]"
        @current-change="onPageChange"
        @size-change="onSizeChange"
      />
    </el-card>

    <!-- 解析数据 显示窗口 -->
    <el-dialog v-model="importVisible" title="批量录入日线" width="960px">
      <el-alert type="info" :closable="false" style="margin-bottom: 12px">
        每行一条，列顺序：<b
          >日期 开盘 最高 最低 收盘 成交量 [成交额] [涨幅] [换手率]</b
        >； 支持从 Excel 复制（Tab 分隔）或逗号分隔。
        日期格式：<code>2026-10-10</code>或<code>2026/10/10</code> 或
        <code>20261010</code>。
      </el-alert>

      <el-input
        v-model="importText"
        type="textarea"
        :rows="8"
        placeholder="粘贴数据…"
        @blur="onParse"
      />

      <div style="margin-top: 12px">
        <el-button @click="onParse">解析预览</el-button>
        <span v-if="parsedRows.length" style="margin-left: 8px">
          解析出 <b>{{ parsedRows.length }}</b> 条
        </span>
      </div>

      <el-alert
        v-if="parseErrors.length"
        type="warning"
        :closable="false"
        style="margin-top: 8px"
        :title="`${parseErrors.length} 行解析失败`"
      >
        <ul style="margin: 4px 0; padding-left: 20px">
          <li v-for="e in parseErrors.slice(0, 5)" :key="e.line">
            第 {{ e.line }} 行：{{ e.message }}
          </li>
        </ul>
      </el-alert>

      <el-table
        v-if="parsedRows.length"
        :data="parsedRows.slice(0, 20)"
        size="small"
        style="margin-top: 12px"
        max-height="240"
      >
        <el-table-column prop="date" label="日期" width="110" />
        <el-table-column prop="open" label="开盘" width="80" />
        <el-table-column prop="high" label="最高" width="80" />
        <el-table-column prop="low" label="最低" width="80" />
        <el-table-column prop="close" label="收盘" width="80" />
        <el-table-column label="成交量" width="110">
          <template #default="{ row }">{{ formatVolume(row.volume) }}</template>
        </el-table-column>
        <el-table-column label="成交额" width="110">
          <template #default="{ row }">{{ formatAmount(row.amount) }}</template>
        </el-table-column>
        <el-table-column prop="pctChange" label="涨幅" width="110" />
        <el-table-column prop="turnover" label="换手率" width="110" />
      </el-table>
      <div
        v-if="parsedRows.length > 20"
        style="text-align: center; color: #999; margin-top: 8px"
      >
        仅展示前 20 条，共 {{ parsedRows.length }} 条
      </div>

      <template #footer>
        <el-button @click="importVisible = false">取消</el-button>
        <el-button
          type="primary"
          :loading="submitting"
          :disabled="parsedRows.length === 0"
          @click="onSubmitImport"
        >
          提交 {{ parsedRows.length }} 条
        </el-button>
      </template>
    </el-dialog>

    <!-- 单条录入的表单 显示窗口 -->
    <el-dialog v-model="singleVisible" :title="dialogTitle" width="520px">
      <el-form
        ref="singleFormRef"
        :model="singleForm"
        :rules="singleRules"
        label-width="90px"
      >
        <el-form-item label="日期" prop="date">
          <el-date-picker
            v-model="singleForm.date"
            type="date"
            value-format="YYYY-MM-DD"
            placeholder="选择日期"
            style="width: 100%"
          />
        </el-form-item>
        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item label="开盘" prop="open">
              <el-input-number
                v-model="singleForm.open"
                :precision="2"
                :step="0.01"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="最高" prop="high">
              <el-input-number
                v-model="singleForm.high"
                :precision="2"
                :step="0.01"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="最低" prop="low">
              <el-input-number
                v-model="singleForm.low"
                :precision="2"
                :step="0.01"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="收盘" prop="close">
              <el-input-number
                v-model="singleForm.close"
                :precision="2"
                :step="0.01"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="成交量" prop="volume">
          <el-input
            v-model="singleForm.volume"
            type="number"
            placeholder="请输入成交量"
            class="input-with-select"
          >
            <!-- 右侧：单位下拉选择 -->
            <template #append>
              <el-select
                v-model="singleForm.volumeUnit"
                placeholder="单位"
                style="width: 90px"
              >
                <el-option label="万手" value="WAN_SHOU" />
                <el-option label="手" value="SHOU" />
                <el-option label="股" value="GU" />
              </el-select>
            </template>
          </el-input>
        </el-form-item>
        <el-form-item label="成交额">
          <el-input
            v-model="singleForm.amount"
            type="number"
            placeholder="请输入成效额"
            class="input-with-select"
          >
            <!-- 右侧：单位下拉选择 -->
            <template #append>
              <el-select
                v-model="singleForm.amountUnit"
                placeholder="单位"
                style="width: 90px"
              >
                <el-option label="亿元" value="YI" />
                <el-option label="万元" value="WAN" />
                <el-option label="元" value="CNY" />
              </el-select>
            </template>
          </el-input>
        </el-form-item>
        <el-form-item label="涨幅(%)">
          <el-input-number
            v-model="singleForm.pctChange"
            :precision="2"
            :step="0.01"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="换手率(%)">
          <el-input-number
            v-model="singleForm.turnover"
            :precision="2"
            :step="0.01"
            style="width: 100%"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="singleVisible = false">取消</el-button>
        <el-button
          type="primary"
          :loading="singleSubmitting"
          @click="onSubmitSingle"
          >确定</el-button
        >
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, reactive, watch, onMounted } from "vue";
import { useRoute } from "vue-router";
import {
  dayjs,
  ElMessage,
  ElMessageBox,
  type FormInstance,
} from "element-plus";
import { Upload, Delete, Refresh, Plus, Edit } from "@element-plus/icons-vue";
import { useStockStore } from "@/stores/stock";
import { useQuoteStore } from "@/stores/quote";
import { stockApi } from "@/api/stock";
import { quoteApi, type DailyQuote, type QuoteInput } from "@/api/quote";
import { parseQuoteText, type ParsedRow } from "@/utils/parseQuoteText";
import type { Stock } from "@/api/stock";
import { TrendCharts } from "@element-plus/icons-vue";

// 增加图表
import { computed as vueComputed } from "vue";
import type { EChartsOption } from "echarts";
import BaseChart from "@/components/charts/BaseChart.vue";
import { useRequest } from "@/composables/useRequest";

const route = useRoute();
const stockStore = useStockStore();
const quoteStore = useQuoteStore();

const dialogMode = ref<"create" | "edit">("create");
const dialogTitle = computed(() => {
  return dialogMode.value === "create" ? "单条录入" : "编辑";
});

// 从路由参数中安全地提取 id，并确保只有当 id 是一个非空字符串时才返回该值，否则返回 null
const stockId = computed<string | null>(() => {
  const id = route.params.id;
  return typeof id === "string" && id.length > 0 ? id : null;
});

/* const stock = ref<Stock | null>(null);
async function loadStock() {
  if (stockId.value === null) return;
  stock.value = await stockApi.detail(stockId.value);
} */

// 用useRequest替换loadStock股票详情
const { data: stock, run: loadStock } = useRequest(
  (id: string) => stockStore.fetchDetail(id), //走缓存逻辑
  { manual: true, initialData: null as Stock | null },
);

const range = reactive({
  from: "",
  to: "",
});
/* async function loadQuotes() {
  if (stockId.value === null) return;
  await quoteStore.fetchList(
    stockId.value,
    range.from || undefined,
    range.to || undefined,
  );
} */

// 使用useRequest替换loadQuotes
// 由于列表需要存分页信息，你依然可以用 store，或者直接用 useRequest
const { loading: listLoading, run: loadQuotes } = useRequest(
  (id: string, from?: string, to?: string) =>
    quoteApi.list({
      stockId: id,
      from: from || undefined, //修复空字符串，传undefined
      to: to || undefined, //修复空字符串，传undefined
      page: quoteStore.page,
      pageSize: quoteStore.pageSize,
    }),
  {
    manual: true,
    onSuccess: (res) => {
      quoteStore.list = res.list;
      quoteStore.total = res.total;
    },
  },
);

function onPageChange(p: number) {
  if (stockId.value === null) return;
  quoteStore.page = p;
  void loadQuotes(stockId.value, range.from, range.to);
}

function onSizeChange(s: number) {
  if (stockId.value === null) return;
  quoteStore.pageSize = s;
  quoteStore.page = 1;
  void loadQuotes(stockId.value, range.from, range.to);
}

onMounted(async () => {
  if (stockId.value === null) return;
  const id = stockId.value;

  void loadStock(id);
  void loadQuotes(id, range.from, range.to);
  void loadKline(id);
});

watch(stockId, async (newId) => {
  if (newId === null) return;
  void loadStock(newId);
  void loadQuotes(newId, range.from, range.to);
  void loadKline(newId);
});

// ==================== 金额/数量格式化（表格显示用） ====================
// 格式化成交量（假设数据库存的是“股”或“手”，这里统一按“手”展示，1手=100股）
// 如果你的数据源存的就是“手”，直接 /1e4 即可；如果存的是“股”，可以在这里 /100 转手。
function formatVolume(v: number | null | undefined): string {
  if (v === null || v === undefined) return "—";

  // 1. 股转手：1手 = 100股
  const shou = v / 100;

  // 2. 格式化
  if (shou >= 1e8) {
    return `${(shou / 1e8).toFixed(2)}亿手`;
  }
  if (shou >= 1e4) {
    return `${(shou / 1e4).toFixed(2)}万手`;
  }

  // 低于 1 万手，直接显示整数（或保留 2 位小数以防万一）
  // 正常情况成交量换算成手后都是整数，所以用 Math.floor 或直接 toFixed(0)
  return `${Math.round(shou).toLocaleString()}手`;
}

// 格式化成交额
function formatAmount(v: number | null | undefined): string {
  if (v === null || v === undefined) return "—";
  const abs = Math.abs(v);
  const sign = v < 0 ? "-" : "";
  if (abs >= 1e8) return `${sign}${(abs / 1e8).toFixed(2)}亿`;
  if (abs >= 1e4) return `${sign}${(abs / 1e4).toFixed(2)}万`;
  return `${sign}${abs.toFixed(2)}`;
}

// ==================== 表单单位转换（录入用） ====================
type AmountUnit = "CNY" | "WAN" | "YI";
type VolumeUnit = "GU" | "SHOU" | "WAN_SHOU"; // 股，手，万手

const unitToMultiplier = {
  CNY: 1,
  WAN: 1e4,
  YI: 1e8,
};

const volumeUnitToMultiplier = {
  GU: 1,
  SHOU: 100, // 1 手 = 100 股
  WAN_SHOU: 1e6, // 1 万手 = 10,000 手 * 100 = 1,000,000 股 (1e6)
};

//统一转换为基础单位（元 / 股）
function convertToBaseUnit(
  value: number | string | undefined,
  unit: AmountUnit | VolumeUnit,
): number {
  if (value === "" || value === undefined || value === null) return 0;
  const num = Number(value);
  if (isNaN(num)) return 0;

  if (unit in unitToMultiplier) {
    return num * unitToMultiplier[unit as AmountUnit];
  }

  return num * volumeUnitToMultiplier[unit as VolumeUnit];
}

// 单条录入
const singleVisible = ref(false);
const singleFormRef = ref<FormInstance>();
const singleSubmitting = ref(false);

const singleForm = reactive({
  date: "",
  open: undefined as number | undefined,
  high: undefined as number | undefined,
  low: undefined as number | undefined,
  close: undefined as number | undefined,

  volume: undefined as number | undefined,
  volumeUnit: "WAN_SHOU" as VolumeUnit,

  amount: undefined as number | undefined,
  amountUnit: "YI" as AmountUnit,

  pctChange: undefined as number | undefined,
  turnover: undefined as number | undefined,
});

const singleRules = {
  date: [{ required: true, message: "请选择日期", trigger: "change" }],
  open: [{ required: true, type: "number", message: "必填", trigger: "blur" }],
  high: [{ required: true, type: "number", message: "必填", trigger: "blur" }],
  low: [{ required: true, type: "number", message: "必填", trigger: "blur" }],
  close: [{ required: true, type: "number", message: "必填", trigger: "blur" }],
  volume: [{ required: true, message: "必填", trigger: "blur" }],
};

function openSingle() {
  dialogMode.value = "create";
  Object.assign(singleForm, {
    date: "",
    open: undefined,
    high: undefined,
    low: undefined,
    close: undefined,
    volume: undefined,
    amount: undefined,
    pctChange: undefined,
    turnover: undefined,
  });
  singleVisible.value = true;
}

async function onSubmitSingle() {
  // 在提交时，将带有单位的数据转换为基础单位（元/手）提交给后端
  if (stockId.value === null) return;
  if (!singleFormRef.value) return;

  const valid = await singleFormRef.value.validate().catch(() => false);
  if (!valid) return;

  singleSubmitting.value = true;
  try {
    // 转换单位
    const payload = {
      stockId: stockId.value,
      date: singleForm.date,
      open: Number(singleForm.open),
      high: Number(singleForm.high),
      low: Number(singleForm.low),
      close: Number(singleForm.close),

      // 成交量
      volume: convertToBaseUnit(singleForm.volume, singleForm.volumeUnit),
      // 成交额
      amount:
        convertToBaseUnit(singleForm.amount, singleForm.amountUnit) ||
        undefined,

      pctChange: singleForm.pctChange
        ? Number(singleForm.pctChange)
        : undefined,
      turnover: singleForm.turnover,
    };

    await quoteApi.create(payload);
    ElMessage.success("录入成功");
    singleVisible.value = false;
    // 录入成功后，同时刷新列表和图表
    if (stockId.value !== null) {
      await loadQuotes(stockId.value, range.from, range.to);
      await loadKline(stockId.value);
    }
  } finally {
    singleSubmitting.value = false;
  }
}

// 单条编辑
function openEdit(row: QuoteInput) {
  dialogMode.value = "edit";

  // 自动匹配单位的辅助函数
  const autoAmountUnit = (val: number | null | undefined) => {
    if (!val) return { value: undefined, unit: "CNY" as AmountUnit };
    if (Math.abs(val) > 1e8)
      return { value: val / 1e8, unit: "YI" as AmountUnit };
    if (Math.abs(val) > 1e4)
      return { value: val / 1e4, unit: "WAN" as AmountUnit };

    return { value: val, unit: "CNY" as AmountUnit };
  };

  const autoVolumeUnit = (val: number | null | undefined) => {
    if (!val) return { value: undefined, unit: "GU" as VolumeUnit };

    // 1. 如果能被 1,000,000 (1万手) 整除，按“万手”显示
    if (val % 1e6 === 0) {
      return { value: val / 1e6, unit: "WAN_SHOU" as VolumeUnit };
    }

    // 2. 如果能被 100 (1手) 整除，按“手”显示
    if (val % 100 === 0) {
      return { value: val / 100, unit: "SHOU" as VolumeUnit };
    }

    // 3. 如果是有零头的股数，直接按“股”显示（保证精确度）
    return { value: val, unit: "GU" as VolumeUnit };
  };

  const vol = autoVolumeUnit(row.volume);
  const amt = autoAmountUnit(row.amount);

  const safeDate = row.date ? dayjs(row.date).format("YYYY-MM-DD") : "";

  Object.assign(singleForm, {
    date: safeDate,
    open: row.open,
    high: row.high,
    low: row.low,
    close: row.close,

    volume: vol.value,
    volumeUnit: vol.unit,

    amount: amt.value,
    amountUnit: amt.unit,

    pctChange: row.pctChange ?? undefined,
    turnover: row.turnover ?? undefined,
  });
  singleVisible.value = true;
}

// 批量录入
const importVisible = ref(false);
const importText = ref("");
const parsedRows = ref<ParsedRow[]>([]);
const parseErrors = ref<{ line: number; message: string }[]>([]);
const submitting = ref(false);

function onParse() {
  const result = parseQuoteText(importText.value);
  parsedRows.value = result.rows;
  parseErrors.value = result.errors;
}

async function onSubmitImport() {
  if (stockId.value === null) return;

  if (parsedRows.value.length === 0) {
    ElMessage.warning("没有可提交的数据");
    return;
  }

  submitting.value = true;
  try {
    const res = await quoteStore.batchCreate(stockId.value, parsedRows.value);
    //高度
    console.log("batch result:", res);
    ElMessage.success(
      `新增${res.created}条数据，更新${res.updated}条数据，跳过${res.skipped}条数据`,
    );

    if (res.errors.length > 0) {
      ElMessage.error(`有${res.errors.length}条数据提交失败`);
    }

    importVisible.value = false;
    importText.value = "";
    parsedRows.value = [];
    parseErrors.value = [];

    // 批量录入成功后，同时刷新列表和图表
    if (stockId.value !== null) {
      await loadQuotes(stockId.value, range.from, range.to);
      await loadKline(stockId.value);
    }
  } finally {
    submitting.value = false;
  }
}

async function onDelete(row: { id: string }) {
  if (stockId.value === null) return;

  try {
    await ElMessageBox.confirm(`确定要删除 ${row.id} 这条日线吗？`, "提示", {
      confirmButtonText: "删除",
      cancelButtonText: "取消",
      type: "warning",
    });
  } catch {
    return;
  }

  await quoteStore.remove(row.id, stockId.value);
  ElMessage.success("删除成功");
  // 删除成功后，同时刷新列表和图表
  await loadQuotes(stockId.value, range.from, range.to);
  await loadKline(stockId.value);
}

const title = computed(() => {
  if (!stock.value) return "股票详情";
  return `${stock.value.name}（${stock.value.code}）`;
});

// ---------- K 线数据 ----------
/* const klineData = ref<DailyQuote[]>([]);
const klineLoading = ref(false);

async function loadKline() {
  if (stockId.value === null) return;
  klineLoading.value = true;
  try {
    klineData.value = await quoteApi.latest(stockId.value, 120);
  } finally {
    klineLoading.value = false;
  }
} */

// 使用useRequest重写loadKline
// 声明式请求
const {
  data: klineData, // 日线数据
  loading: klineLoading, //加载状态
  run: loadKline, // 请求方法
} = useRequest(
  (id: string) => quoteApi.latest(id, 120),
  { manual: true, initialData: [] as DailyQuote[] }, // 手动触发
);

// 筛选变化时不重载 K 线（固定 120 天）
// 需要时也可 watch(stockId, loadKline)

// ---------- K 线图配置 ----------
const klineOption = vueComputed<EChartsOption | null>(() => {
  // 在开头收窄一次
  const data = klineData.value ?? [];
  if (data.length === 0) return null;

  const dates = data.map((q) => q.date.slice(0, 10));
  // ECharts candlestick 要求 [open, close, low, high]
  const candles = data.map((q) => [q.open, q.close, q.low, q.high]);
  const volumes = data.map((q) => ({
    value: q.volume,
    itemStyle: {
      color: q.close >= q.open ? "#ef232a" : "#14b143",
    },
  }));

  // MA5 / MA10 / MA20
  function calcMA(n: number): (number | null)[] {
    const result: (number | null)[] = [];
    for (let i = 0; i < data.length; i += 1) {
      if (i < n - 1) {
        result.push(null); // 前 n-1 天不够，填 null
        continue;
      }
      let sum = 0;
      for (let j = 0; j < n; j += 1) {
        sum += data[i - j]!.close;
      }
      result.push(sum / n);
    }
    return result;
  }

  const ma5 = calcMA(5);
  const ma10 = calcMA(10);
  const ma20 = calcMA(20);

  return {
    animation: false,
    tooltip: {
      trigger: "axis", // 鼠标放在某个 X 坐标上，显示该列所有 series 的值
      axisPointer: { type: "cross" }, // 十字准星
      backgroundColor: "rgba(255,255,255,0.95)",
      borderColor: "#ddd",
      borderWidth: 1,
      padding: 10,
      // 自定义formatter，把提示框中的英文改成中文，并格式化小数点
      formatter: (params: any) => {
        if (!params || params.length === 0) return "";

        // 1. 获取当前是第几条数据
        const dataIndex = params[0].dataIndex;
        // 2. 直接从你的源数组里取，绝对错不了！
        const originalData = data[dataIndex];
        if (!originalData) return "";

        const date = originalData.date.slice(0, 10);
        let html = `<div style="margin-bottom: 8px; font-weight: bold; font-size: 14px;">${date}</div>`;

        // 3. 直接取对象里的值
        const open = originalData.open;
        const close = originalData.close;
        const low = originalData.low;
        const high = originalData.high;
        const volume = originalData.volume;

        const isUp = close >= open;
        const color = isUp ? "#ef232a" : "#14b143";

        html += `
          <div style="display: grid; grid-template-columns: 50px 1fr; gap: 4px 12px; font-size: 13px;">
            <span style="color: #666;">开盘:</span> <span style="font-weight: bold; color: ${color}; text-align: right;">${Number(open).toFixed(2)}</span>
            <span style="color: #666;">收盘:</span> <span style="font-weight: bold; color: ${color}; text-align: right;">${Number(close).toFixed(2)}</span>
            <span style="color: #666;">最低:</span> <span style="font-weight: bold; color: ${color}; text-align: right;">${Number(low).toFixed(2)}</span>
            <span style="color: #666;">最高:</span> <span style="font-weight: bold; color: ${color}; text-align: right;">${Number(high).toFixed(2)}</span>
            <span style="color: #666;">成交量:</span> <span style="font-weight: bold; text-align: right;">${formatVolume(volume)}</span>
          </div>
        `;

        // 均线部分
        const lineParams = params.filter(
          (p: any) => p.seriesType === "line" && p.value != null,
        );
        if (lineParams.length > 0) {
          html += `<div style="border-top: 1px dashed #eee; margin-top: 8px; padding-top: 8px;">`;
          lineParams.forEach((p: any) => {
            html += `
              <div style="display: flex; justify-content: space-between; align-items: center; font-size: 13px; margin-bottom: 4px;">
                <span style="display: flex; align-items: center; gap: 6px;">
                  <span style="display:inline-block; width:8px; height:8px; border-radius:50%; background:${p.color};"></span>
                  ${p.seriesName}
                </span>
                <span style="font-weight: bold;">${Number(p.value).toFixed(2)}</span>
              </div>
            `;
          });
          html += `</div>`;
        }
        return html;
      },
    },
    legend: {
      data: ["K线", "MA5", "MA10", "MA20"],
      top: 0,
    },
    grid: [
      { left: 50, right: 20, top: 30, height: "55%" }, // K 线区域
      { left: 50, right: 20, top: "75%", height: "15%", bottom: 35 }, // 成交量区域
    ],
    xAxis: [
      {
        type: "category",
        data: dates,
        boundaryGap: true,
        axisLine: { onZero: false },
        splitLine: { show: false },
        axisLabel: { show: false }, // 上方不显示日期文字，避免和下方重复
        min: "dataMin",
        max: "dataMax",
      },
      {
        type: "category",
        gridIndex: 1,
        data: dates,
        boundaryGap: true,
        axisLine: { onZero: false },
        axisTick: { show: false },
        splitLine: { show: false },
        axisLabel: { show: true }, // 只有最底下显示日期
        min: "dataMin",
        max: "dataMax",
      },
    ],
    yAxis: [
      {
        // 第1个Y轴：K线价格
        scale: true,
        splitArea: { show: true },
        axisLine: { show: false },
        axisTick: { show: false },
        axisLabel: {
          show: true,
          color: "#666",
          formatter: (value: number) => {
            return value.toFixed(2);
          },
        },
      },
      {
        // 第2个Y轴：成交量
        gridIndex: 1,
        min: 0,
        splitNumber: 4,
        axisLabel: {
          show: true,
          color: "#666",
          formatter: (value: number) => {
            // 1. 先把“股”转成“手”
            const shou = value / 100;

            // 2. 根据“手”的数量级进行格式化展示
            if (shou >= 1e8) return `${(shou / 1e8).toFixed(1)}亿手`;
            if (shou >= 1e4) return `${(shou / 1e4).toFixed(0)}万手`; // 图表Y轴不需要2位小数，直接取整更清爽
            return `${shou}手`;
          },
        },
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: { show: false },
      },
    ],
    dataZoom: [
      { type: "inside", xAxisIndex: [0, 1], start: 50, end: 100 }, // [0,1]上下排联动的关键,0 只控制 K 线区的缩放；
      {
        show: true,
        xAxisIndex: [0, 1],
        type: "slider",
        bottom: 5,
        height: 16,
        start: 50,
        end: 100,
      },
    ],
    series: [
      {
        name: "K线",
        type: "candlestick",
        data: candles,
        itemStyle: {
          color: "#ef232a", // 阳线红
          color0: "#14b143", // 阴线绿
          borderColor: "#ef232a",
          borderColor0: "#14b143",
        },
      },
      {
        name: "MA5",
        type: "line",
        data: ma5,
        smooth: true, //线条变成贝塞尔曲线（平滑）
        showSymbol: false, //默认折线图会在每个数据点画一个小圆点,false → 不画点，只画线，图更清爽；
        lineStyle: { width: 1 },
      },
      {
        name: "MA10",
        type: "line",
        data: ma10,
        smooth: true,
        showSymbol: false,
        lineStyle: { width: 1 },
      },
      {
        name: "MA20",
        type: "line",
        data: ma20,
        smooth: true,
        showSymbol: false,
        lineStyle: { width: 1 },
      },
      {
        name: "成交量",
        type: "bar",
        xAxisIndex: 1, // 绑定到第 2 个 X 轴
        yAxisIndex: 1, // 绑定到第 2 个 Y 轴
        data: volumes,
      },
    ],
  };
});
</script>

<style scoped>
.stock-detail {
  padding: 8px;
}
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.title {
  font-weight: 600;
  font-size: 16px;
}
.toolbar {
  display: flex;
  gap: 8px;
  align-items: center;
  margin-bottom: 12px;
}
.up {
  color: #f56c6c;
}
.down {
  color: #67c23a;
}
</style>
