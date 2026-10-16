<template>
  <div class="stock-page">
    <el-card shadow="never">
      <div class="toolbar">
        <div class="left">
          <el-input
            v-model="store.keyword"
            placeholder="搜索代码 / 名称"
            clearable
            style="width: 220px"
            @keyup.enter="onSearch"
          >
            <template #prefix
              ><el-icon><Search /></el-icon
            ></template>
          </el-input>
          <el-select
            v-model="store.market"
            placeholder="全部市场"
            clearable
            style="width: 130px"
            @change="onSearch"
          >
            <el-option
              v-for="m in marketOptions"
              :key="m.value"
              :value="m.value"
              :label="m.label"
            />
          </el-select>
          <el-button type="primary" @click="onSearch">查询</el-button>
          <el-button :icon="Refresh" @click="onReset">重置</el-button>
        </div>
        <div class="right">
          <el-button type="primary" :icon="Plus" @click="openCreate"
            >新增股票</el-button
          >
        </div>
      </div>

      <el-table
        :data="store.list"
        v-loading="store.loading"
        stripe
        style="margin-top: 12px"
      >
        <el-table-column prop="code" label="代码" width="120" />
        <el-table-column prop="name" label="名称" min-width="140">
          <template #default="{ row }">
            <el-link
              type="primary"
              @click="$router.push(`/stocks/${row.id}`)"
              >{{ row.name }}</el-link
            >
          </template>
        </el-table-column>
        <el-table-column prop="market" label="市场" width="100">
          <template #default="{ row }">
            <el-tag size="small">{{ row.market }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="industry" label="行业" min-width="120">
          <template #default="{ row }">{{ row.industry ?? "—" }}</template>
        </el-table-column>
        <el-table-column label="上市日期" width="120">
          <template #default="{ row }">
            {{ row.listDate ? row.listDate.slice(0, 10) : "—" }}
          </template>
        </el-table-column>
        <el-table-column label="状态" width="90">
          <template #default="{ row }">
            <el-tag :type="row.isActive ? 'success' : 'info'" size="small">
              {{ row.isActive ? "启用" : "停用" }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" :icon="Edit" @click="openEdit(row)"
              >编辑</el-button
            >
            <el-button link type="danger" :icon="Delete" @click="onDelete(row)"
              >删除</el-button
            >
            <el-button
              link
              type="primary"
              @click="$router.push(`/stocks/${row.id}/fund-flow`)"
            >
              资金流
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        style="margin-top: 16px; justify-content: flex-end"
        layout="total, sizes, prev, pager, next"
        :total="store.total"
        :current-page="store.page"
        :page-size="store.pageSize"
        :page-sizes="[10, 20, 50, 100]"
        @current-change="
          (p: number) => {
            store.page = p;
            store.fetchList();
          }
        "
        @size-change="
          (s: number) => {
            store.pageSize = s;
            store.page = 1;
            store.fetchList();
          }
        "
      />
    </el-card>

    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="480px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
        <el-form-item label="代码" prop="code">
          <el-input
            v-model="form.code"
            :disabled="dialogMode === 'edit'"
            placeholder="如 600519"
          />
        </el-form-item>
        <el-form-item label="名称" prop="name">
          <el-input v-model="form.name" placeholder="如 贵州茅台" />
        </el-form-item>
        <el-form-item label="市场" prop="market">
          <el-select v-model="form.market" style="width: 100%">
            <el-option
              v-for="m in marketOptions"
              :key="m.value"
              :value="m.value"
              :label="m.label"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="行业">
          <el-input v-model="form.industry" placeholder="可选" />
        </el-form-item>
        <el-form-item label="上市日期">
          <el-date-picker
            v-model="form.listDate"
            type="date"
            value-format="YYYY-MM-DD"
            placeholder="可选"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item v-if="dialogMode === 'edit'" label="状态">
          <el-switch
            v-model="form.isActive"
            active-text="启用"
            inactive-text="停用"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="onSubmit"
          >确定</el-button
        >
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, reactive, onMounted } from "vue";
import { ElMessage, ElMessageBox, type FormInstance } from "element-plus";
import { Plus, Search, Refresh, Edit, Delete } from "@element-plus/icons-vue";
import { useStockStore } from "@/stores/stock";
import type { Market, Stock, StockUpsertPayload } from "@/api/stock";

const store = useStockStore();

const marketOptions = [
  { label: "上海", value: "SH" },
  { label: "深圳", value: "SZ" },
  { label: "北京", value: "BJ" },
  { label: "香港", value: "HK" },
];

// 弹窗
const dialogVisible = ref(false);
const dialogMode = ref<"create" | "edit">("create");
const editingId = ref<string | null>(null);
const formRef = ref<FormInstance>();
const submitting = ref(false);

const form = reactive<StockUpsertPayload & { isActive?: boolean }>({
  code: "",
  name: "",
  market: "SH",
  industry: "",
  listDate: "",
  isActive: true,
});

const rules = {
  code: [{ required: true, message: "请输入股票代码", trigger: "blur" }],
  name: [{ required: true, message: "请输入股票名称", trigger: "blur" }],
  market: [{ required: true, message: "请选择股票市场", trigger: "change" }],
};

const dialogTitle = computed(() =>
  dialogMode.value === "create" ? "新增股票" : "编辑股票",
);

function openCreate() {
  dialogMode.value = "create";
  editingId.value = null;
  Object.assign(form, {
    code: "",
    name: "",
    market: "SH",
    industry: "",
    listDate: "",
    isActive: true,
  });
  dialogVisible.value = true;
}

function openEdit(row: Stock) {
  dialogMode.value = "edit";
  editingId.value = row.id;
  Object.assign(form, {
    code: row.code,
    name: row.name,
    market: row.market,
    industry: row.industry ?? "",
    listDate: row.listDate ? row.listDate.slice(0, 10) : "",
    isActive: row.isActive,
  });
  dialogVisible.value = true;
}

async function onSubmit() {
  if (!formRef.value) return;

  const valid = await formRef.value.validate().catch(() => false);
  if (!valid) return;

  submitting.value = true;
  try {
    if (dialogMode.value === "create") {
      await store.create({
        code: form.code,
        name: form.name,
        market: form.market,
        industry: form.industry || undefined,
        listDate: form.listDate || undefined,
      });

      ElMessage.success("创建成功");
    } else if (editingId.value) {
      await store.update(editingId.value, {
        name: form.name,
        market: form.market,
        industry: form.industry || undefined,
        listDate: form.listDate || undefined,
        isActive: form.isActive,
      });
      ElMessage.success("更新成功");
    }

    dialogVisible.value = false;
  } finally {
    submitting.value = false;
  }
}

async function onDelete(row: Stock) {
  try {
    await ElMessageBox.confirm(
      `确定要删除${row.name}(${row.code})吗？`,
      "提示",
      {
        confirmButtonText: "删除",
        cancelButtonText: "取消",
        type: "warning",
      },
    );
  } catch {
    return;
  }

  await store.remove(row.id);
  ElMessage.success("删除成功");
}

function onSearch() {
  store.page = 1;
  void store.fetchList();
}

function onReset() {
  void store.reset();
}

onMounted(() => {
  void store.fetchList();
});
</script>

<style scoped>
.stock-page {
  padding: 8px;
}
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}
.left {
  display: flex;
  gap: 8px;
  align-items: center;
}
.right {
  display: flex;
  gap: 8px;
  align-items: center;
}
</style>
