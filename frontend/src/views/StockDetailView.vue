<template>
  <div class="stock-detail">
    <el-card shadow="never">
      <template #header>
        <div class="header">
          <div>
            <span class="title">{{ title }}</span>
            <el-tag v-if="stock" size="small" style="margin-left: 8px">{{
              stock.market
            }}</el-tag>
          </div>
          <el-button
            type="primary"
            :icon="Upload"
            @click="importVisible = true"
          >
            批量录入
          </el-button>
        </div>
      </template>

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
        <el-button type="primary" @click="loadQuotes">查询</el-button>
        <el-button
          :icon="Refresh"
          @click="
            () => {
              range.from = '';
              range.to = '';
              loadQuotes();
            }
          "
        >
          重置
        </el-button>
        <el-button :icon="Plus" @click="openSingle">单条录入</el-button>
      </div>
      <!-- 日数据显示列表 -->
      <el-table :data="quoteStore.list" v-loading="quoteStore.loading" stripe>
        <el-table-column label="日期" width="120">
          <template #default="{ row }">{{ row.date.slice(0, 10) }}</template>
        </el-table-column>
        <el-table-column prop="open" label="开盘" width="100" />
        <el-table-column prop="high" label="最高" width="100" />
        <el-table-column prop="low" label="最低" width="100" />
        <el-table-column prop="close" label="收盘" width="100" />
        <el-table-column label="成交量WS" width="100">
          <template #default="{ row }">{{
            row.volume != null ? row.volume.toLocaleString() : "—"
          }}</template>
        </el-table-column>
        <el-table-column label="成交额Y" width="100">
          <template #default="{ row }">{{
            row.amount != null ? row.amount.toLocaleString() : "—"
          }}</template>
        </el-table-column>
        <el-table-column label="涨跌幅" width="100">
          <template #default="{ row }">
            <span :class="row.pctChange >= 0 ? 'up' : 'down'">
              {{
                row.pctChange != null
                  ? `${(row.pctChange * 100).toFixed(2)}%`
                  : "—"
              }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="换手率" width="100">
          <template #default="{ row }">{{
            row.turnover != null ? row.amount.toLocaleString() : "—"
          }}</template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="openEdit(row)"
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
    <el-dialog v-model="importVisible" title="批量录入日线" width="720px">
      <el-alert type="info" :closable="false" style="margin-bottom: 12px">
        每行一条，列顺序：<b
          >日期 开盘 最高 最低 收盘 成交量 [成交额] [涨跌幅]</b
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
        <el-table-column prop="volume" label="成交量" width="110" />
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
          <el-input-number
            v-model="singleForm.volume"
            :min="0"
            :step="1000"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="成交额">
          <el-input-number
            v-model="singleForm.amount"
            :min="0"
            :precision="2"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="涨跌幅(%)">
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
import { Upload, Delete, Refresh, Plus } from "@element-plus/icons-vue";
import { useStockStore } from "@/stores/stock";
import { useQuoteStore } from "@/stores/quote";
import { stockApi } from "@/api/stock";
import { quoteApi, type DailyQuote, type QuoteInput } from "@/api/quote";
import { parseQuoteText, type ParsedRow } from "@/utils/parseQuoteText";
import type { Stock } from "@/api/stock";

const route = useRoute();
const stockStore = useStockStore();
const quoteStore = useQuoteStore();

const dialogMode = ref<"create" | "edit">("create");
const dialogTitle = computed(() => {
  return dialogMode.value === "create" ? "单条录入" : "编辑";
});
const editingId = ref<string | null>(null);

// 从路由参数中安全地提取 id，并确保只有当 id 是一个非空字符串时才返回该值，否则返回 null
const stockId = computed<string | null>(() => {
  const id = route.params.id;
  return typeof id === "string" && id.length > 0 ? id : null;
});

const stock = ref<Stock | null>(null);

const range = reactive({
  from: "",
  to: "",
});

async function loadStock() {
  if (stockId.value === null) return;
  stock.value = await stockApi.detail(stockId.value);
}

async function loadQuotes() {
  if (stockId.value === null) return;
  await quoteStore.fetchList(
    stockId.value,
    range.from || undefined,
    range.to || undefined,
  );
}

function onPageChange(p: number) {
  quoteStore.page = p;
  void loadQuotes();
}

function onSizeChange(s: number) {
  quoteStore.pageSize = s;
  quoteStore.page = 1;
  void loadQuotes();
}

onMounted(async () => {
  await loadStock();
  await loadQuotes();
});

watch(stockId, async () => {
  await loadStock();
  await loadQuotes();
});

// 单条录入
const singleVisible = ref(false);
const singleFormRef = ref<FormInstance>();
const singleSubmitting = ref(false);

const singleForm = reactive({
  date: "",
  open: 0,
  high: 0,
  low: 0,
  close: 0,
  volume: 0,
  amount: undefined as number | undefined,
  pctChange: undefined as number | undefined,
  turnover: undefined as number | undefined,
});

const singleRules = {
  date: [{ required: true, message: "请选择日期", trigger: "change" }],
  open: [{ required: true, type: "number", message: "必填", trigger: "blur" }],
  high: [{ required: true, type: "number", message: "必填", trigger: "blur" }],
  low: [{ required: true, type: "number", message: "必填", trigger: "blur" }],
  close: [{ required: true, type: "number", message: "必填", trigger: "blur" }],
  volume: [
    { required: true, type: "number", message: "必填", trigger: "blur" },
  ],
};

function openSingle() {
  Object.assign(singleForm, {
    date: "",
    open: 0,
    high: 0,
    low: 0,
    close: 0,
    volume: 0,
    amount: undefined,
    pctChange: undefined,
    turnover: undefined,
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
    await quoteApi.create({
      stockId: stockId.value,
      date: singleForm.date,
      open: singleForm.open,
      high: singleForm.high,
      low: singleForm.low,
      close: singleForm.close,
      volume: singleForm.volume,
      amount: singleForm.amount,
      pctChange: singleForm.pctChange,
      turnover: singleForm.turnover,
    });
    ElMessage.success("录入成功");
    singleVisible.value = false;
    await loadQuotes();
  } finally {
    singleSubmitting.value = false;
  }
}

// 单条编辑
function openEdit(row: QuoteInput) {
  dialogMode.value = "edit";
  const safeDate = row.date ? dayjs(row.date).format("YYYY-MM-DD") : "";
  Object.assign(singleForm, {
    date: safeDate,
    open: row.open,
    high: row.high,
    low: row.low,
    close: row.close,
    volume: row.volume ?? 0,
    amount: row.amount ?? 0,
    pctChange: row.pctChange ?? 0,
    turnover: row.turnover ?? 0,
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

    await loadQuotes();
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
}

const title = computed(() => {
  if (!stock.value) return "股票详情";
  return `${stock.value.name}（${stock.value.code}）`;
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
