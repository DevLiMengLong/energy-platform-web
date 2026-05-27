<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { Plus, RefreshCw, Save, Search, X } from 'lucide-vue-next';
import {
  ApiClient,
  findPage,
  formatCellValue,
  pickLabel,
  platformPages,
  type FormFieldConfig,
  type MicroAppContext,
  type PageResult
} from '@energy-platform/shared';

const props = defineProps<{ context: MicroAppContext }>();
const pages = platformPages;
const pageSizeOptions = [10, 20, 50];
const pageNo = ref(1);
const size = ref(10);
const total = ref(0);
const rows = ref<Record<string, unknown>[]>([]);
const treeNodes = ref<Record<string, unknown>[]>([]);
const collapsedTreeRows = ref<string[]>([]);
const loading = ref(false);
const error = ref('');
const drawerOpen = ref(false);
const filters = reactive<Record<string, string>>({});
const form = reactive<Record<string, string | number | boolean | null>>({});
const page = computed(() => findPage(pages, props.context.routePath));
const columns = computed(() => page.value.columns ?? []);
const filterConfigs = computed(() => page.value.filters ?? []);
const pageCount = computed(() => Math.max(1, Math.ceil(total.value / size.value)));
const client = computed(() => new ApiClient(props.context.apiBase, () => props.context.token));

function label(zh: string, en: string) {
  return pickLabel(props.context.language, zh, en);
}

async function loadData() {
  loading.value = true;
  error.value = '';
  try {
    if (page.value.mode === 'tree' || page.value.mode === 'treeTable') {
      treeNodes.value = await client.value.get<Record<string, unknown>[]>(page.value.endpoint, activeFilterParams());
      applyTreePagination();
    } else {
      const data = await client.value.get<PageResult>(page.value.endpoint, {
        ...activeFilterParams(),
        page: pageNo.value,
        size: size.value
      });
      rows.value = data.rows;
      total.value = data.total;
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : String(err);
    rows.value = [];
    total.value = 0;
  } finally {
    loading.value = false;
  }
}

function flattenTree(nodes: Record<string, unknown>[], level = 0): Record<string, unknown>[] {
  return nodes.flatMap((node) => {
    const children = Array.isArray(node.children) ? (node.children as Record<string, unknown>[]) : [];
    const nodeKey = treeRowKey(node);
    const row = { ...node, _level: level, _hasChildren: children.length > 0 };
    if (collapsedTreeRows.value.includes(nodeKey)) {
      return [row];
    }
    return [row, ...flattenTree(children, level + 1)];
  });
}

function activeFilterParams(): Record<string, string> {
  return filterConfigs.value.reduce<Record<string, string>>((params, filter) => {
    const value = filters[filter.key];
    if (value) {
      params[filter.key] = value;
    }
    return params;
  }, {});
}

function displayValue(row: Record<string, unknown>, key: string, type?: string): string {
  if (type === 'actions') {
    return actionText();
  }
  if (type === 'visibility') {
    return Number(row[key]) ? label('隐藏', 'Hidden') : label('显示', 'Visible');
  }
  if (type === 'boolean' && typeof row[key] !== 'boolean') {
    return Number(row[key]) ? label('是', 'Yes') : label('否', 'No');
  }
  return formatCellValue(row[key], props.context.language, key);
}

function statusDisabled(row: Record<string, unknown>, key: string): boolean {
  return row[key] !== 'ENABLED';
}

function actionText(): string {
  if (page.value.routePath.includes('/menus')) {
    return label('编辑 / 删除', 'Edit / Delete');
  }
  if (page.value.routePath.includes('/users')) {
    return label('编辑 / 详情 / 停用', 'Edit / Detail / Disable');
  }
  return label('编辑 / 停用', 'Edit / Disable');
}

function treeRowKey(row: Record<string, unknown>): string {
  return String(row.id ?? row.code ?? row.menuCode ?? row.nameZh ?? JSON.stringify(row));
}

function hasChildren(row: Record<string, unknown>): boolean {
  return Boolean(row._hasChildren);
}

function toggleTreeRow(row: Record<string, unknown>) {
  const key = treeRowKey(row);
  collapsedTreeRows.value = collapsedTreeRows.value.includes(key)
    ? collapsedTreeRows.value.filter((item) => item !== key)
    : [...collapsedTreeRows.value, key];
  applyTreePagination();
}

function applyTreePagination() {
  const flattened = flattenTree(treeNodes.value);
  total.value = flattened.length;
  const maxPage = Math.max(1, Math.ceil(total.value / size.value));
  if (pageNo.value > maxPage) {
    pageNo.value = maxPage;
  }
  const start = (pageNo.value - 1) * size.value;
  rows.value = flattened.slice(start, start + size.value);
}

function setFilterValue(key: string, event: Event) {
  filters[key] = (event.target as HTMLInputElement | HTMLSelectElement).value;
}

function searchTable() {
  pageNo.value = 1;
  loadData();
}

function resetFilters() {
  filterConfigs.value.forEach((filter) => {
    filters[filter.key] = '';
  });
  searchTable();
}

function goPage(nextPage: number) {
  const target = Math.min(Math.max(nextPage, 1), pageCount.value);
  if (target === pageNo.value) {
    return;
  }
  pageNo.value = target;
  if (page.value.mode === 'tree' || page.value.mode === 'treeTable') {
    applyTreePagination();
  } else {
    loadData();
  }
}

function changePageSize(event: Event) {
  size.value = Number((event.target as HTMLSelectElement).value);
  pageNo.value = 1;
  if (page.value.mode === 'tree' || page.value.mode === 'treeTable') {
    applyTreePagination();
  } else {
    loadData();
  }
}

function openCreate() {
  const create = page.value.create;
  if (!create) {
    return;
  }
  Object.keys(form).forEach((key) => delete form[key]);
  create.fields.forEach((field) => {
    form[field.key] = field.type === 'boolean' ? false : '';
  });
  drawerOpen.value = true;
}

async function submitCreate() {
  const create = page.value.create;
  if (!create) {
    return;
  }
  const payload: Record<string, unknown> = {};
  create.fields.forEach((field) => {
    payload[field.key] = normalizeField(field, form[field.key]);
  });
  loading.value = true;
  error.value = '';
  try {
    await client.value.post(create.endpoint, payload);
    drawerOpen.value = false;
    await loadData();
  } catch (err) {
    error.value = err instanceof Error ? err.message : String(err);
  } finally {
    loading.value = false;
  }
}

function normalizeField(field: FormFieldConfig, value: unknown): unknown {
  if (field.type === 'number') {
    return value === '' || value === null ? null : Number(value);
  }
  return value;
}

function setBooleanField(key: string, event: Event) {
  form[key] = (event.target as HTMLInputElement).checked;
}

function setFieldValue(key: string, event: Event) {
  form[key] = (event.target as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement).value;
}

watch(() => props.context.routePath, () => {
  pageNo.value = 1;
  drawerOpen.value = false;
  collapsedTreeRows.value = [];
  Object.keys(filters).forEach((key) => delete filters[key]);
  filterConfigs.value.forEach((filter) => {
    filters[filter.key] = '';
  });
  loadData();
});

onMounted(loadData);
</script>

<template>
  <section class="micro-workspace">
    <header class="workspace-header">
      <div>
        <h2>{{ label(page.titleZh, page.titleEn) }}</h2>
        <span>{{ total }} {{ label('条记录', 'records') }}</span>
      </div>
      <div class="workspace-actions">
        <button class="ep-button icon" :title="label('刷新', 'Refresh')" @click="loadData">
          <RefreshCw :size="16" />
        </button>
        <button v-if="page.create" class="ep-button primary" @click="openCreate">
          <Plus :size="16" />
          {{ label(page.create.titleZh, page.create.titleEn) }}
        </button>
      </div>
    </header>

    <section v-if="filterConfigs.length" class="workspace-filters">
      <label v-for="filter in filterConfigs" :key="filter.key" class="filter-field">
        <span>{{ label(filter.labelZh, filter.labelEn) }}</span>
        <select
          v-if="filter.type === 'select'"
          class="ep-select"
          :value="filters[filter.key] ?? ''"
          @change="setFilterValue(filter.key, $event)"
        >
          <option v-for="option in filter.options" :key="option.value" :value="option.value">
            {{ label(option.labelZh, option.labelEn) }}
          </option>
        </select>
        <input
          v-else
          class="ep-input"
          :type="filter.type === 'date' ? 'date' : 'text'"
          :value="filters[filter.key] ?? ''"
          :placeholder="label('请输入', 'Please input')"
          @input="setFilterValue(filter.key, $event)"
          @keyup.enter="searchTable"
        />
      </label>
      <div class="filter-actions">
        <button class="ep-button primary" @click="searchTable">
          <Search :size="16" />
          {{ label('查询', 'Search') }}
        </button>
        <button class="ep-button" @click="resetFilters">{{ label('重置', 'Reset') }}</button>
      </div>
    </section>

    <div v-if="error" class="workspace-alert">{{ error }}</div>

    <div class="workspace-table-wrap">
      <table v-if="rows.length" :class="['ep-table', { 'menu-tree-table': page.mode === 'treeTable' }]">
        <thead>
          <tr>
            <th v-for="column in columns" :key="column.key" :style="{ width: column.width }">
              {{ label(column.labelZh, column.labelEn) }}
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, rowIndex) in rows" :key="String(row.id ?? rowIndex)">
            <td v-for="(column, colIndex) in columns" :key="column.key">
              <span
                v-if="column.type === 'status'"
                :class="['ep-status', { disabled: statusDisabled(row, column.key) }]"
              >
                {{ displayValue(row, column.key, column.type) }}
              </span>
              <span
                v-else-if="column.tree"
                :class="['tree-menu-cell', `level-${Number(row._level ?? 0)}`]"
              >
                <button
                  :class="['tree-toggle', { empty: !hasChildren(row) }]"
                  :disabled="!hasChildren(row)"
                  @click.stop="toggleTreeRow(row)"
                >
                  {{ hasChildren(row) ? (collapsedTreeRows.includes(treeRowKey(row)) ? '▸' : '▾') : '' }}
                </button>
                <span class="tree-menu-name">{{ displayValue(row, column.key, column.type) }}</span>
              </span>
              <span v-else :style="colIndex === 0 ? { paddingLeft: `${Number(row._level ?? 0) * 18}px` } : undefined">
                {{ displayValue(row, column.key, column.type) }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-else class="ep-empty">{{ loading ? label('加载中', 'Loading') : label('暂无数据', 'No data') }}</div>
    </div>

    <footer class="workspace-footer">
      <span>{{ label('共', 'Total') }} {{ total }} {{ label('条', 'items') }}</span>
      <button class="page-no" :disabled="pageNo <= 1" @click="goPage(pageNo - 1)">‹</button>
      <button
        v-for="item in pageCount"
        :key="item"
        :class="['page-no', { active: item === pageNo }]"
        @click="goPage(item)"
      >
        {{ item }}
      </button>
      <button class="page-no" :disabled="pageNo >= pageCount" @click="goPage(pageNo + 1)">›</button>
      <select class="ep-select page-size-select" :value="size" @change="changePageSize">
        <option v-for="option in pageSizeOptions" :key="option" :value="option">
          {{ option }} {{ label('条/页', '/ page') }}
        </option>
      </select>
    </footer>

    <div v-if="drawerOpen && page.create" class="workspace-drawer">
      <form class="drawer-panel" @submit.prevent="submitCreate">
        <header>
          <h3>{{ label(page.create.titleZh, page.create.titleEn) }}</h3>
          <button type="button" class="ep-button icon" @click="drawerOpen = false">
            <X :size="16" />
          </button>
        </header>
        <label v-for="field in page.create.fields" :key="field.key" class="drawer-field">
          <span>{{ label(field.labelZh, field.labelEn) }}</span>
          <textarea
            v-if="field.type === 'textarea'"
            :value="String(form[field.key] ?? '')"
            class="ep-textarea"
            rows="4"
            :required="field.required"
            @input="setFieldValue(field.key, $event)"
          />
          <select
            v-else-if="field.type === 'select'"
            :value="String(form[field.key] ?? '')"
            class="ep-select"
            :required="field.required"
            @change="setFieldValue(field.key, $event)"
          >
            <option v-for="option in field.options" :key="String(option.value)" :value="option.value">
              {{ label(option.labelZh, option.labelEn) }}
            </option>
          </select>
          <input
            v-else-if="field.type === 'boolean'"
            type="checkbox"
            :checked="Boolean(form[field.key])"
            @change="setBooleanField(field.key, $event)"
          />
          <input
            v-else
            :value="String(form[field.key] ?? '')"
            class="ep-input"
            :type="field.type === 'number' ? 'number' : field.type === 'time' ? 'time' : 'text'"
            :required="field.required"
            @input="setFieldValue(field.key, $event)"
          />
        </label>
        <button class="ep-button primary" :disabled="loading">
          <Save :size="16" />
          {{ label('保存', 'Save') }}
        </button>
      </form>
    </div>
  </section>
</template>
