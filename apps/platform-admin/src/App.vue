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
const keyword = ref('');
const pageNo = ref(1);
const size = ref(10);
const total = ref(0);
const rows = ref<Record<string, unknown>[]>([]);
const loading = ref(false);
const error = ref('');
const drawerOpen = ref(false);
const form = reactive<Record<string, string | number | boolean | null>>({});
const page = computed(() => findPage(pages, props.context.routePath));
const columns = computed(() => page.value.columns ?? []);
const client = computed(() => new ApiClient(props.context.apiBase, () => props.context.token));

function label(zh: string, en: string) {
  return pickLabel(props.context.language, zh, en);
}

async function loadData() {
  loading.value = true;
  error.value = '';
  try {
    if (page.value.mode === 'tree') {
      const data = await client.value.get<Record<string, unknown>[]>(page.value.endpoint);
      rows.value = flattenTree(data);
      total.value = rows.value.length;
    } else {
      const data = await client.value.get<PageResult>(page.value.endpoint, {
        keyword: keyword.value,
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
    return [{ ...node, _level: level }, ...flattenTree(children, level + 1)];
  });
}

function displayValue(row: Record<string, unknown>, key: string): string {
  return formatCellValue(row[key], props.context.language, key);
}

function statusDisabled(row: Record<string, unknown>, key: string): boolean {
  return row[key] !== 'ENABLED';
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
        <label v-if="page.mode !== 'tree'" class="workspace-search">
          <Search :size="16" />
          <input v-model="keyword" :placeholder="label('搜索', 'Search')" @keyup.enter="loadData" />
        </label>
        <button class="ep-button icon" :title="label('刷新', 'Refresh')" @click="loadData">
          <RefreshCw :size="16" />
        </button>
        <button v-if="page.create" class="ep-button primary" @click="openCreate">
          <Plus :size="16" />
          {{ label(page.create.titleZh, page.create.titleEn) }}
        </button>
      </div>
    </header>

    <div v-if="error" class="workspace-alert">{{ error }}</div>

    <div class="workspace-table-wrap">
      <table v-if="rows.length" class="ep-table">
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
                {{ displayValue(row, column.key) }}
              </span>
              <span v-else :style="colIndex === 0 ? { paddingLeft: `${Number(row._level ?? 0) * 18}px` } : undefined">
                {{ displayValue(row, column.key) }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-else class="ep-empty">{{ loading ? label('加载中', 'Loading') : label('暂无数据', 'No data') }}</div>
    </div>

    <footer v-if="page.mode !== 'tree'" class="workspace-footer">
      <button class="ep-button" :disabled="pageNo <= 1" @click="pageNo--; loadData()">
        {{ label('上一页', 'Previous') }}
      </button>
      <span>{{ pageNo }} / {{ Math.max(1, Math.ceil(total / size)) }}</span>
      <button class="ep-button" :disabled="pageNo >= Math.ceil(total / size)" @click="pageNo++; loadData()">
        {{ label('下一页', 'Next') }}
      </button>
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
