<template>
  <div class="fund-flow-page">
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
            <el-button type="primary" :icon="Upload" @click="openImport"
              >批量录入</el-button
            >
            <el-button type="success" :icon="Plus" @click="openSingle"
              >单条录入</el-button
            >
            <el-button
              type="danger"
              :icon="View"
              @click="$router.push(`/stocks/${stockId}`)"
              >详情页</el-button
            >
          </div>
        </div>
      </template>

      <!-- 工具栏 -->
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
        <el-button type="primary" @click="loadAll">查询</el-button>
        <el-button
          :icon="Refresh"
          @click="
            () => {
              range.from = '';
              range.to = '';
              loadAll();
            }
          "
          >重置</el-button
        >
      </div>

      <!-- 分析卡片 -->
      <div v-if="flowStore.analysis" class="analysis">
        <div class="stat-item">
          <div class="stat-title">最新主力净额</div>
          <div
            :class="[
              'stat-value',
              amountClass(flowStore.analysis.latestMainNet),
            ]"
          >
            {{ formatAmount(flowStore.analysis.latestMainNet) }}
          </div>
        </div>

        <div class="stat-item">
          <div class="stat-title">最新5日主力</div>
          <div
            :class="[
              'stat-value',
              amountClass(flowStore.analysis.latestMainNet5d),
            ]"
          >
            {{ formatAmount(flowStore.analysis.latestMainNet5d) }}
          </div>
        </div>

        <div class="stat-item">
          <div class="stat-title">连续净流入</div>
          <div class="stat-value text-blue">
            {{ flowStore.analysis.consecutiveInflowDays ?? 0 }}
            <span class="unit">天</span>
          </div>
        </div>

        <div class="stat-item">
          <div class="stat-title">连续净流出</div>
          <div class="stat-value text-green">
            {{ flowStore.analysis.consecutiveOutflowDays ?? 0 }}
            <span class="unit">天</span>
          </div>
        </div>

        <div class="score">
          <div class="score-label">资金流强度</div>
          <el-progress
            :percentage="flowStore.analysis.inflowScore ?? 0"
            :status="
              flowStore.analysis.trend === 'bullish'
                ? 'success'
                : flowStore.analysis.trend === 'bearish'
                  ? 'exception'
                  : undefined
            "
            :stroke-width="12"
            :show-text="false"
          />
          <div
            style="
              display: flex;
              justify-content: space-between;
              margin-top: 6px;
            "
          >
            <el-tag
              :type="
                flowStore.analysis.trend === 'bullish'
                  ? 'danger'
                  : flowStore.analysis.trend === 'bearish'
                    ? 'success'
                    : 'info'
              "
              size="small"
              effect="dark"
            >
              {{
                flowStore.analysis.trend === "bullish"
                  ? "主力流入"
                  : flowStore.analysis.trend === "bearish"
                    ? "主力流出"
                    : "中性"
              }}
            </el-tag>
            <span style="font-size: 12px; color: #666"
              >{{ flowStore.analysis.inflowScore ?? 0 }} 分</span
            >
          </div>
        </div>
      </div>

      <!-- 加图表 -->
      <el-card shadow="never" style="margin-bottom: 16px">
        <template #header>
          <span>主力净额（近 60 个交易日）</span>
        </template>
        <BaseChart
          :option="flowOption"
          height="360px"
          :loading="flowChartLoading"
        />
      </el-card>

      <!-- 数据表格 -->
      <el-table :data="flowStore.list" v-loading="flowStore.loading" stripe>
        <el-table-column label="日期" width="110">
          <template #default="{ row }">{{ row.date.slice(0, 10) }}</template>
        </el-table-column>
        <el-table-column label="主力净额" min-width="110">
          <template #default="{ row }">
            <span :class="amountClass(row.mainNet)">{{
              formatAmount(row.mainNet)
            }}</span>
          </template>
        </el-table-column>
        <el-table-column label="5日主力" min-width="110">
          <template #default="{ row }">
            <span :class="amountClass(row.mainNet5d)">{{
              formatAmount(row.mainNet5d)
            }}</span>
          </template>
        </el-table-column>
        <el-table-column label="超大单" min-width="100">
          <template #default="{ row }">
            <span :class="amountClass(row.superLargeNet)">{{
              formatAmount(row.superLargeNet)
            }}</span>
          </template>
        </el-table-column>
        <el-table-column label="大单" min-width="100">
          <template #default="{ row }">
            <span :class="amountClass(row.largeNet)">{{
              formatAmount(row.largeNet)
            }}</span>
          </template>
        </el-table-column>
        <el-table-column label="中单" min-width="100">
          <template #default="{ row }">
            <span :class="amountClass(row.mediumNet)">{{
              formatAmount(row.mediumNet)
            }}</span>
          </template>
        </el-table-column>
        <el-table-column label="小单" min-width="100">
          <template #default="{ row }">
            <span :class="amountClass(row.smallNet)">{{
              formatAmount(row.smallNet)
            }}</span>
          </template>
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
        :total="flowStore.total"
        :current-page="flowStore.page"
        :page-size="flowStore.pageSize"
        :page-sizes="[20, 50, 100, 200]"
        @current-change="
          (p: number) => {
            flowStore.page = p;
            loadAll();
          }
        "
        @size-change="
          (s: number) => {
            flowStore.pageSize = s;
            flowStore.page = 1;
            loadAll();
          }
        "
      />
    </el-card>

    <!-- 批量录入 显示窗口 -->
    <el-dialog v-model="importVisible" title="批量录入资金流" width="760px">
      <el-alert type="info" :closable="false" style="margin-bottom: 12px">
        每行一条，列顺序：<b
          >日期 主力净额 [5日主力] [10日主力] [超大单] [大单] [中单] [小单]</b
        >。<br />
        金额支持：纯数字、<code>1.2亿</code>、<code>5000万</code>。日期格式：<code
          >2026-10-12</code
        >
        或 <code>20261012</code>。
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
        <el-table-column label="主力净额" width="110">
          <template #default="{ row }">{{
            formatAmount(row.mainNet)
          }}</template>
        </el-table-column>
        <el-table-column label="5日主力" width="110">
          <template #default="{ row }">{{
            formatAmount(row.mainNet5d)
          }}</template>
        </el-table-column>
      </el-table>

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

    <!-- 单条录入 显示窗口 -->
    <el-dialog v-model="singleVisible" :title="dialogTitle" width="520px">
      <el-form
        ref="singleFormRef"
        :model="singleForm"
        :rules="singleRules"
        label-width="100px"
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
        <el-form-item label="主力净额" prop="mainNet">
          <!-- 左侧：数值输入框 -->
          <el-input
            v-model="singleForm.mainNet"
            type="number"
            placeholder="请输入主力净额"
            class="input-with-select"
          >
            <!-- 右侧：单位下拉选择 -->
            <template #append>
              <el-select
                v-model="singleForm.mainNetUnit"
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
        <el-form-item label="5日主力">
          <el-input
            v-model="singleForm.mainNet5d"
            type="number"
            placeholder="请输入5日主力净额"
            class="input-with-select"
          >
            <!-- 右侧：单位下拉选择 -->
            <template #append>
              <el-select
                v-model="singleForm.mainNet5dUnit"
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
        <el-form-item label="超大单">
          <el-input
            v-model="singleForm.superLargeNet"
            type="number"
            placeholder="请输入超大单金额"
            class="input-with-select"
          >
            <!-- 右侧：单位下拉选择 -->
            <template #append>
              <el-select
                v-model="singleForm.superLargeNetUnit"
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
        <el-form-item label="大单">
          <el-input
            v-model="singleForm.largeNet"
            type="number"
            placeholder="请输入大单金额"
            class="input-with-select"
          >
            <!-- 右侧：单位下拉选择 -->
            <template #append>
              <el-select
                v-model="singleForm.largeNetUnit"
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
        <el-form-item label="中单">
          <el-input
            v-model="singleForm.mediumNet"
            type="number"
            placeholder="请输入中单金额"
            class="input-with-select"
          >
            <!-- 右侧：单位下拉选择 -->
            <template #append>
              <el-select
                v-model="singleForm.mediumNetUnit"
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
        <el-form-item label="小单">
          <el-input
            v-model="singleForm.smallNet"
            type="number"
            placeholder="请输入中单金额"
            class="input-with-select"
          >
            <!-- 右侧：单位下拉选择 -->
            <template #append>
              <el-select
                v-model="singleForm.smallNetUnit"
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
import { ref, watch, computed, onMounted, reactive } from "vue";
import { useRoute } from "vue-router";
import {
  dayjs,
  ElMessage,
  ElMessageBox,
  type FormInstance,
} from "element-plus";
import {
  Plus,
  Upload,
  Delete,
  Refresh,
  View,
  Edit,
} from "@element-plus/icons-vue";
import { useFundFlowStore } from "@/stores/fundFlow";
import { useStockStore } from "@/stores/stock";
import { stockApi } from "@/api/stock";
import type { Stock } from "@/api/stock";
import {
  parseFundFlowText,
  type ParsedFlowRow,
} from "@/utils/parseFundFlowText";

// 加图表
import { computed as vueComputed } from "vue";
import type { EChartsOption } from "echarts";
import BaseChart from "@/components/charts/BaseChart.vue";
import { fundFlowApi } from "@/api/fund-flow";
import type { FundFlow, FundFlowInput } from "@/api/fund-flow";

const route = useRoute();
const flowStore = useFundFlowStore();
const stockId = computed<string | null>(() => {
  const id = route.params.id;
  return typeof id === "string" && id.length > 0 ? id : null;
});

const stock = ref<Stock | null>(null);
const range = reactive({ from: "", to: "" });

const dialogMode = ref<"create" | "edit">("create");
const dialogTitle = computed(() => {
  return dialogMode.value === "create" ? "单条录入" : "编辑";
});
async function loadStock() {
  if (stockId.value === null) return;
  stock.value = await stockApi.detail(stockId.value);
}

async function loadAll() {
  if (stockId.value === null) return;
  await Promise.all([
    flowStore.fetchList(
      stockId.value,
      range.from || undefined,
      range.to || undefined,
    ),
    flowStore.fetchAnalysis(stockId.value),
  ]);
}

onMounted(async () => {
  await loadStock();
  await loadAll();
  void loadFlowChart();
});

watch(stockId, async () => {
  await loadStock();
  await loadAll();
});

// ---------- 金额格式化 ----------
function formatAmount(v: number | null | undefined): string {
  if (v === null || v === undefined) return "—";
  const abs = Math.abs(v);
  const sign = v < 0 ? "-" : "";
  if (abs >= 1e8) return `${sign}${(abs / 1e8).toFixed(2)}亿`;
  if (abs >= 1e4) return `${sign}${(abs / 1e4).toFixed(2)}万`;
  return `${sign}${abs.toFixed(2)}`;
}

function amountClass(v: number | null | undefined): string {
  if (v === null || v === undefined || v === 0) return "";
  return v > 0 ? "up" : "down";
}

// ---------- 批量录入 ----------
const importVisible = ref(false);
const importText = ref("");
const parsedRows = ref<ParsedFlowRow[]>([]);
const parseErrors = ref<{ line: number; message: string }[]>([]);
const submitting = ref(false);

function openImport() {
  importText.value = "";
  parsedRows.value = [];
  parseErrors.value = [];
  importVisible.value = true;
}

function onParse() {
  const res = parseFundFlowText(importText.value);
  parsedRows.value = res.rows;
  parseErrors.value = res.errors;
}

async function onSubmitImport() {
  if (stockId.value === null) return;
  if (parsedRows.value.length === 0) {
    ElMessage.warning("没有可提交的数据");
    return;
  }
  submitting.value = true;
  try {
    const res = await flowStore.batchCreate(stockId.value, parsedRows.value);
    ElMessage.success(
      `新增 ${res.created}，更新 ${res.updated}，跳过 ${res.skipped}`,
    );
    if (res.errors.length > 0) {
      const detail = res.errors
        .slice(0, 3)
        .map((e) => `第 ${e.index + 1} 条（${e.date}）：${e.message}`)
        .join("；");
      ElMessage.warning(`${res.errors.length} 条失败：${detail}`);
    }
    importVisible.value = false;
    await loadAll();
  } finally {
    submitting.value = false;
  }
}

// ---------- 单条录入 ----------
type AmountUnit = "CNY" | "WAN" | "YI";
const singleVisible = ref(false);
const singleFormRef = ref<FormInstance>();
const singleSubmitting = ref(false);
const singleForm = reactive({
  date: "",
  mainNet: undefined as number | undefined,
  mainNetUnit: "WAN" as AmountUnit, // 默认选万元
  mainNet5d: undefined as number | undefined,
  mainNet5dUnit: "YI" as AmountUnit,
  superLargeNet: undefined as number | undefined,
  superLargeNetUnit: "WAN" as AmountUnit,
  largeNet: undefined as number | undefined,
  largeNetUnit: "WAN" as AmountUnit,
  mediumNet: undefined as number | undefined,
  mediumNetUnit: "WAN" as AmountUnit,
  smallNet: undefined as number | undefined,
  smallNetUnit: "WAN" as AmountUnit,
});

const singleRules = {
  date: [{ required: true, message: "请选择日期", trigger: "change" }],
  mainNet: [{ required: true, message: "必填", trigger: "blur" }],
};

function converToYuan(value: number | undefined, unit: AmountUnit): number {
  if (value === undefined || isNaN(value)) return 0;

  switch (unit) {
    case "YI":
      return value * 100000000;
    case "WAN":
      return value * 10000;
    case "CNY":
    default:
      return value;
  }
}
function openSingle() {
  dialogMode.value = "create";
  Object.assign(singleForm, {
    date: "",
    mainNet: undefined,
    mainNetUnit: "WAN",
    mainNet5d: undefined,
    mainNet5dUnit: "YI",
    superLargeNet: undefined,
    superLargeNetUnit: "WAN",
    largeNet: undefined,
    largeNetUnit: "WAN",
    mediumNet: undefined,
    mediumNetUnit: "WAN",
    smallNet: undefined,
    smallNetUnit: "WAN",
  });
  singleVisible.value = true;
}

async function onSubmitSingle() {
  if (stockId.value === null) return;
  if (!singleFormRef.value) return;
  const valid = await singleFormRef.value.validate().catch(() => false);
  if (!valid) return;

  singleSubmitting.value = true;

  try {
    // 在提交前，将各个字段统一转换为“元”
    const payload = {
      date: singleForm.date,
      mainNet: converToYuan(singleForm.mainNet, singleForm.mainNetUnit),
      mainNet5d: converToYuan(singleForm.mainNet5d, singleForm.mainNet5dUnit),
      superLargeNet: converToYuan(
        singleForm.superLargeNet,
        singleForm.superLargeNetUnit,
      ),
      largeNet: converToYuan(singleForm.largeNet, singleForm.largeNetUnit),
      mediumNet: converToYuan(singleForm.mediumNet, singleForm.mediumNetUnit),
      smallNet: converToYuan(singleForm.smallNet, singleForm.smallNetUnit),
    };
    await flowStore.create(stockId.value, payload);
    ElMessage.success("录入成功");
    singleVisible.value = false;
    await loadAll();
  } finally {
    singleSubmitting.value = false;
  }
}

function openEdit(row: FundFlowInput) {
  dialogMode.value = "edit";
  const safeDate = row.date ? dayjs(row.date).format("YYYY-MM-DD") : "";

  // 辅助函数，把数值自动转成最合适的单位
  const autoUnit = (
    val: number | null | undefined,
  ): { value: number; unit: AmountUnit } => {
    if (!val) return { value: 0, unit: "CNY" };
    const abs = Math.abs(val);
    if (abs >= 1e8)
      return { value: Number((val / 1e8).toFixed(4)), unit: "YI" };
    if (abs >= 1e4)
      return { value: Number((val / 1e4).toFixed(4)), unit: "WAN" };
    return { value: val, unit: "CNY" };
  };
  const mainNetInit = autoUnit(row.mainNet);
  const mainNet5dInit = autoUnit(row.mainNet5d);
  const superLargeNetInit = autoUnit(row.superLargeNet);
  const largeNetInit = autoUnit(row.largeNet);
  const mediumNetInit = autoUnit(row.mediumNet);
  const smallNetInit = autoUnit(row.smallNet);
  Object.assign(singleForm, {
    date: safeDate,
    mainNet: mainNetInit.value,
    mainNetUnit: mainNetInit.unit,
    mainNet5d: mainNet5dInit.value,
    mainNet5dUnit: mainNet5dInit.unit,
    superLargeNet: superLargeNetInit.value,
    superLargeNetUnit: superLargeNetInit.unit,
    largeNet: largeNetInit.value,
    largeNetUnit: largeNetInit.unit,
    mediumNet: mediumNetInit.value,
    mediumNetUnit: mediumNetInit.unit,
    smallNet: smallNetInit.value,
    smallNetUnit: smallNetInit.unit,
    mainNetRatio: row.mainNetRatio ?? null,
    turnover: row.turnover ?? null,
  });
  singleVisible.value = true;
}
async function onDelete(row: { id: string }) {
  if (stockId.value === null) return;
  try {
    await ElMessageBox.confirm("确定删除这条资金流记录吗？", "提示", {
      type: "warning",
    });
  } catch {
    return;
  }
  await flowStore.remove(row.id, stockId.value);
  ElMessage.success("删除成功");
  await loadAll();
}

const title = computed(() => {
  if (!stock.value) return "资金流";
  return `${stock.value.name}（${stock.value.code}）资金流`;
});

// 加图表
const flowChartData = ref<FundFlow[]>([]);
const flowChartLoading = ref(false);

async function loadFlowChart() {
  if (stockId.value === null) return;
  flowChartLoading.value = true;
  try {
    flowChartData.value = await fundFlowApi.latest(stockId.value, 60);
  } finally {
    flowChartLoading.value = false;
  }
}

const flowOption = vueComputed<EChartsOption | null>(() => {
  if (flowChartData.value.length === 0) return null;

  // 如果数据少于 20 条，就不显示底部的滑动条
  const showZoom = flowChartData.value.length > 20;
  const dates = flowChartData.value.map((f) => f.date.slice(0, 10));
  const mainNet = flowChartData.value.map((f) => f.mainNet);
  const mainNet5d = flowChartData.value.map((f) => f.mainNet5d);

  return {
    animation: false,
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "shadow" },
      valueFormatter: (value) => {
        const v = Number(value);
        if (isNaN(v)) return "—";
        const abs = Math.abs(v);
        if (abs >= 1e8) return `${(v / 1e8).toFixed(2)}亿`;
        if (abs >= 1e4) return `${(v / 1e4).toFixed(2)}万`;
        return `${v.toFixed(2)}`;
      },
    },
    legend: { data: ["主力净额", "5日主力"], top: 0 },
    grid: { left: 60, right: 20, top: 30, bottom: 40 },
    xAxis: {
      type: "category",
      data: dates,
      axisLabel: { rotate: 30 },
    },
    yAxis: {
      type: "value",
      axisLabel: {
        formatter: (value: number) => {
          const abs = Math.abs(value);
          if (abs >= 1e8) return `${(value / 1e8).toFixed(1)}亿`;
          if (abs >= 1e4) return `${(value / 1e4).toFixed(0)}万`;
          return value.toString();
        },
      },
    },
    dataZoom: showZoom
      ? [
          { type: "inside", start: 50, end: 100 },
          { type: "slider", bottom: 10, start: 50, end: 100 },
        ]
      : [],
    series: [
      {
        name: "主力净额",
        type: "bar",
        data: mainNet.map((v) => ({
          value: v,
          itemStyle: { color: v >= 0 ? "#ef232a" : "#14b143" },
        })),
      },
      {
        name: "5日主力",
        type: "line",
        data: mainNet5d,
        smooth: true,
        showSymbol: false,
        lineStyle: { width: 2 },
      },
    ],
  };
});
</script>

<style scoped>
.fund-flow-page {
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

.analysis {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  margin-bottom: 16px;
  padding: 20px;
  background: #f8fafc;
  border-radius: 8px;
}
.stat-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.stat-title {
  font-size: 13px;
  color: #64748b;
}
.stat-value {
  font-size: 20px;
  font-weight: 600;
  font-family: DIN, Arial, sans-serif;
  line-height: 1;
}
.stat-value .unit {
  font-size: 13px;
  font-weight: 400;
  color: #666;
}
.text-blue {
  color: #3b82f6;
}
.text-green {
  color: #10b981;
}
.score {
  flex: 1;
  max-width: 200px;
}
.score-label {
  font-size: 13px;
  color: #64748b;
  margin-bottom: 8px;
}
.score {
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.score-label {
  font-size: 13px;
  color: #64748b;
  margin-bottom: 6px;
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
