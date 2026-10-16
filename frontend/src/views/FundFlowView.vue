<template>
  <div class="fund-flow-page">
    <el-card shadow="never">
      <template #header>
        <div class="header">
          <div>
            <span class="title">{{ title }}</span>
            <el-tag v-if="stock" size="small" style="margin-left: 8px">{{
              stock.market
            }}</el-tag>
          </div>
          <div>
            <el-button :icon="Plus" @click="openSingle">单条录入</el-button>
            <el-button type="primary" :icon="Upload" @click="openImport"
              >批量录入</el-button
            >
          </div>
        </div>
      </template>

      <!-- 分析卡片 -->
      <div v-if="flowStore.analysis" class="analysis">
        <el-statistic
          title="最新主力净额"
          :value="flowStore.analysis.latestMainNet ?? 0"
        >
          <template #suffix>
            <span :class="amountClass(flowStore.analysis.latestMainNet)">
              {{ formatAmount(flowStore.analysis.latestMainNet) }}
            </span>
          </template>
        </el-statistic>
        <el-statistic
          title="5 日主力净额"
          :value="flowStore.analysis.recent5dNet"
        >
          <template #suffix>
            <span :class="amountClass(flowStore.analysis.recent5dNet)">
              {{ formatAmount(flowStore.analysis.recent5dNet) }}
            </span>
          </template>
        </el-statistic>
        <el-statistic
          title="连续净流入"
          :value="flowStore.analysis.consecutiveInflowDays"
          suffix="天"
        />
        <el-statistic
          title="连续净流出"
          :value="flowStore.analysis.consecutiveOutflowDays"
          suffix="天"
        />
        <div class="score">
          <div class="score-label">资金流强度</div>
          <el-progress
            :percentage="flowStore.analysis.inflowScore"
            :status="
              flowStore.analysis.trend === 'bullish'
                ? 'success'
                : flowStore.analysis.trend === 'bearish'
                  ? 'exception'
                  : undefined
            "
            :stroke-width="14"
          />
          <el-tag
            :type="
              flowStore.analysis.trend === 'bullish'
                ? 'danger'
                : flowStore.analysis.trend === 'bearish'
                  ? 'success'
                  : 'info'
            "
            size="small"
            style="margin-top: 6px"
          >
            {{
              flowStore.analysis.trend === "bullish"
                ? "主力持续流入"
                : flowStore.analysis.trend === "bearish"
                  ? "主力持续流出"
                  : "中性"
            }}
          </el-tag>
        </div>
      </div>

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
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
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

    <!-- 批量录入弹窗 -->
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

    <!-- 单条录入弹窗 -->
    <el-dialog v-model="singleVisible" title="单条录入资金流" width="520px">
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
          <el-input-number
            v-model="singleForm.mainNet"
            :step="1000000"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="5日主力">
          <el-input-number
            v-model="singleForm.mainNet5d"
            :step="1000000"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="超大单">
          <el-input-number
            v-model="singleForm.superLargeNet"
            :step="1000000"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="大单">
          <el-input-number
            v-model="singleForm.largeNet"
            :step="1000000"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="中单">
          <el-input-number
            v-model="singleForm.mediumNet"
            :step="1000000"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="小单">
          <el-input-number
            v-model="singleForm.smallNet"
            :step="1000000"
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
import { ref, watch, computed, onMounted, reactive } from "vue";
import { useRoute } from "vue-router";
import { ElMessage, ElMessageBox, type FormInstance } from "element-plus";
import { Plus, Upload, Delete, Refresh } from "@element-plus/icons-vue";
import { useFundFlowStore } from "@/stores/fundFlow";
import { useStockStore } from "@/stores/stock";
import { stockApi } from "@/api/stock";
import type { Stock } from "@/api/stock";
import {
  parseFundFlowText,
  type ParsedFlowRow,
} from "@/utils/parseFundFlowText";

const route = useRoute();
const flowStore = useFundFlowStore();
const stockId = computed<string | null>(() => {
  const id = route.params.id;
  return typeof id === "string" && id.length > 0 ? id : null;
});

const stock = ref<Stock | null>(null);
const range = reactive({ from: "", to: "" });

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
const singleVisible = ref(false);
const singleFormRef = ref<FormInstance>();
const singleSubmitting = ref(false);
const singleForm = reactive({
  date: "",
  mainNet: 0,
  mainNet5d: 0,
  superLargeNet: 0,
  largeNet: 0,
  mediumNet: 0,
  smallNet: 0,
});
const singleRules = {
  date: [{ required: true, message: "请选择日期", trigger: "change" }],
  mainNet: [
    { required: true, type: "number", message: "必填", trigger: "blur" },
  ],
};

function openSingle() {
  Object.assign(singleForm, {
    date: "",
    mainNet: 0,
    mainNet5d: 0,
    superLargeNet: 0,
    largeNet: 0,
    mediumNet: 0,
    smallNet: 0,
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
    await flowStore.create(stockId.value, { ...singleForm });
    ElMessage.success("录入成功");
    singleVisible.value = false;
    await loadAll();
  } finally {
    singleSubmitting.value = false;
  }
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
  display: grid;
  grid-template-columns: repeat(4, 1fr) 1.5fr;
  gap: 16px;
  margin-bottom: 16px;
  padding: 16px;
  background: #f8fafc;
  border-radius: 8px;
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
