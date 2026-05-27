<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import {
  Ban,
  Copy,
  Download,
  Edit3,
  Eye,
  FileInput,
  KeyRound,
  Link2,
  Plus,
  RefreshCw,
  Save,
  Search,
  Settings,
  ShieldCheck,
  Trash2,
  Upload,
  UsersRound,
  X
} from 'lucide-vue-next';
import {
  ApiClient,
  basicPages,
  findPage,
  formatCellValue,
  pickLabel,
  type ActionConfig,
  type ColumnConfig,
  type FormFieldConfig,
  type MicroAppContext,
  type PageResult
} from '@energy-platform/shared';

type DrawerMode = 'form' | 'detail' | 'import' | 'permission' | 'members' | 'params';

const props = defineProps<{ context: MicroAppContext }>();
const pages = basicPages;
const pageSizeOptions = [10, 20, 50];
const pageNo = ref(1);
const size = ref(10);
const total = ref(0);
const rows = ref<Record<string, unknown>[]>([]);
const treeNodes = ref<Record<string, unknown>[]>([]);
const collapsedTreeRows = ref<string[]>([]);
const loading = ref(false);
const error = ref('');
const feedback = ref('');
const drawerOpen = ref(false);
const drawerMode = ref<DrawerMode>('form');
const drawerFields = ref<FormFieldConfig[]>([]);
const activeAction = ref<ActionConfig | null>(null);
const activeRow = ref<Record<string, unknown> | null>(null);
const importMode = ref('UPSERT');
const importFileName = ref('');
const paramRows = ref<Record<string, unknown>[]>([]);
const permissionState = reactive<Record<string, boolean>>({});
const memberState = reactive<Record<string, boolean>>({});
const filters = reactive<Record<string, string>>({});
const form = reactive<Record<string, string | number | boolean | null>>({});
const page = computed(() => findPage(pages, props.context.routePath));
const columns = computed(() => page.value.columns ?? []);
const filterConfigs = computed(() => page.value.filters ?? []);
const pageCount = computed(() => Math.max(1, Math.ceil(total.value / size.value)));
const topActions = computed(() => page.value.topActions ?? []);
const rowActions = computed(() => page.value.rowActions ?? []);
const drawerTitle = computed(() => {
  if (activeAction.value) {
    return actionLabel(activeAction.value);
  }
  return label(page.value.titleZh, page.value.titleEn);
});
const drawerWide = computed(() => ['detail', 'permission', 'members', 'params'].includes(drawerMode.value));
const detailItems = computed(() => {
  const row = activeRow.value ?? {};
  return columns.value
    .filter((column) => column.type !== 'actions')
    .map((column) => ({
      key: column.key,
      label: label(column.labelZh, column.labelEn),
      value: displayValue(row, column.key, column.type)
    }));
});
const permissionGroups = computed(() => [
  {
    title: label('子系统权限', 'Subsystem Permissions'),
    items: [
      { id: 'subsystem-basic', label: label('基础信息', 'Basic Info') },
      { id: 'subsystem-data', label: label('数据采集', 'Data Access') },
      { id: 'subsystem-report', label: label('报表分析', 'Reports') }
    ]
  },
  {
    title: label('菜单权限', 'Menu Permissions'),
    items: [
      { id: 'menu-org', label: label('组织管理', 'Organizations') },
      { id: 'menu-users', label: label('用户管理', 'Users') },
      { id: 'menu-device', label: label('设备管理', 'Devices') },
      { id: 'menu-energy', label: label('能源类型', 'Energy Types') }
    ]
  },
  {
    title: label('按钮权限', 'Button Permissions'),
    items: [
      { id: 'btn-create', label: label('新增', 'Create') },
      { id: 'btn-import', label: label('导入', 'Import') },
      { id: 'btn-export', label: label('导出', 'Export') },
      { id: 'btn-disable', label: label('启用停用', 'Enable/Disable') }
    ]
  }
]);
const memberCandidates = computed(() => [
  { id: '1', label: label('能源主管', 'Energy Manager') },
  { id: '2', label: label('设备维护', 'Device Operator') },
  { id: '3', label: label('报表查看', 'Report Viewer') },
  { id: '4', label: label('园区运营', 'Plant Operator') }
]);
const client = computed(() => new ApiClient(props.context.apiBase, () => props.context.token));

const actionIcons = {
  create: Plus,
  edit: Edit3,
  detail: Eye,
  disable: Ban,
  enable: RefreshCw,
  delete: Trash2,
  export: Download,
  import: Upload,
  assign: ShieldCheck,
  permission: ShieldCheck,
  resetPassword: KeyRound,
  manageUsers: UsersRound,
  manageParams: Settings,
  copy: Copy,
  bind: Link2,
  unlink: X,
  input: FileInput,
  generic: Settings
};

function label(zh: string, en: string) {
  return pickLabel(props.context.language, zh, en);
}

function actionLabel(action: ActionConfig): string {
  return label(action.labelZh, action.labelEn);
}

function actionIcon(action: ActionConfig) {
  return actionIcons[action.kind] ?? Settings;
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

function handleTopAction(action: ActionConfig) {
  handleAction(action, null);
}

function handleRowAction(action: ActionConfig, row: Record<string, unknown>) {
  handleAction(action, row);
}

function handleAction(action: ActionConfig, row: Record<string, unknown> | null) {
  activeAction.value = action;
  activeRow.value = row;
  error.value = '';
  if (action.kind === 'export') {
    exportRows(action);
    submitAction(action, row, { filters: activeFilterParams(), total: total.value }).catch(setError);
    return;
  }
  if (action.kind === 'import') {
    openImport(action, row);
    return;
  }
  if (action.kind === 'create') {
    openForm(action, row, true);
    return;
  }
  if (action.kind === 'edit' || action.kind === 'copy' || action.kind === 'input') {
    openForm(action, row, false);
    return;
  }
  if (action.kind === 'detail') {
    openDetail(action, row);
    return;
  }
  if (action.kind === 'permission' || action.kind === 'assign') {
    openPermission(action, row);
    return;
  }
  if (action.kind === 'manageUsers') {
    openMembers(action, row);
    return;
  }
  if (action.kind === 'manageParams') {
    openParams(action, row);
    return;
  }
  submitAction(action, row, { statusAction: action.kind }).then(() => loadData()).catch(setError);
}

function openForm(action: ActionConfig, row: Record<string, unknown> | null, forceCreate: boolean) {
  const create = page.value.create;
  drawerMode.value = 'form';
  drawerFields.value = forceCreate && create ? create.fields : inferFormFields(action);
  resetForm(drawerFields.value, forceCreate ? null : row);
  drawerOpen.value = true;
}

function openDetail(action: ActionConfig, row: Record<string, unknown> | null) {
  activeAction.value = action;
  activeRow.value = row;
  drawerMode.value = 'detail';
  drawerOpen.value = true;
}

function openImport(action: ActionConfig, row: Record<string, unknown> | null) {
  activeAction.value = action;
  activeRow.value = row;
  importMode.value = 'UPSERT';
  importFileName.value = '';
  drawerMode.value = 'import';
  drawerOpen.value = true;
}

function openPermission(action: ActionConfig, row: Record<string, unknown> | null) {
  activeAction.value = action;
  activeRow.value = row;
  Object.keys(permissionState).forEach((key) => delete permissionState[key]);
  permissionGroups.value.forEach((group) => {
    group.items.forEach((item) => {
      permissionState[item.id] = true;
    });
  });
  drawerMode.value = 'permission';
  drawerOpen.value = true;
}

function openMembers(action: ActionConfig, row: Record<string, unknown> | null) {
  activeAction.value = action;
  activeRow.value = row;
  Object.keys(memberState).forEach((key) => delete memberState[key]);
  memberCandidates.value.forEach((item, index) => {
    memberState[item.id] = index < 2;
  });
  drawerMode.value = 'members';
  drawerOpen.value = true;
}

async function openParams(action: ActionConfig, row: Record<string, unknown> | null) {
  activeAction.value = action;
  activeRow.value = row;
  drawerMode.value = 'params';
  drawerOpen.value = true;
  paramRows.value = [];
  if (!row?.id) {
    return;
  }
  try {
    if (page.value.routePath.includes('/device-models')) {
      paramRows.value = await client.value.get<Record<string, unknown>[]>(`/basic/device-models/${row.id}/params`);
    } else if (page.value.routePath.includes('/devices')) {
      paramRows.value = await client.value.get<Record<string, unknown>[]>(`/basic/devices/${row.id}/params`);
    }
  } catch (err) {
    setError(err);
  }
}

function inferFormFields(action: ActionConfig): FormFieldConfig[] {
  if (action.kind === 'input') {
    return [
      { key: 'dataTime', labelZh: '时间', labelEn: 'Time', required: true },
      { key: 'value', labelZh: '数值', labelEn: 'Value', type: 'number', required: true },
      { key: 'unit', labelZh: '单位', labelEn: 'Unit' },
      { key: 'remark', labelZh: '备注', labelEn: 'Remark', type: 'textarea' }
    ];
  }
  return columns.value
    .filter((column) => !['actions', 'status', 'datetime'].includes(String(column.type ?? '')))
    .filter((column) => !['id', 'createdAt', 'updatedAt', '_actions'].includes(column.key))
    .slice(0, 8)
    .map(fieldFromColumn);
}

function fieldFromColumn(column: ColumnConfig): FormFieldConfig {
  return {
    key: column.key,
    labelZh: column.labelZh,
    labelEn: column.labelEn,
    type: column.type === 'number' ? 'number' : column.type === 'boolean' || column.type === 'visibility' ? 'boolean' : 'text'
  };
}

function resetForm(fields: FormFieldConfig[], row: Record<string, unknown> | null) {
  Object.keys(form).forEach((key) => delete form[key]);
  fields.forEach((field) => {
    if (field.type === 'boolean') {
      form[field.key] = row ? Boolean(Number(row[field.key] ?? 0)) : false;
    } else {
      form[field.key] = row ? String(row[field.key] ?? '') : '';
    }
  });
}

async function submitDrawer() {
  const action = activeAction.value;
  if (!action) {
    return;
  }
  if (drawerMode.value === 'form') {
    await submitForm(action);
  } else if (drawerMode.value === 'import') {
    await submitImport(action);
  } else if (drawerMode.value === 'permission') {
    await submitPermission(action);
  } else if (drawerMode.value === 'members') {
    await submitMembers(action);
  } else if (drawerMode.value === 'params') {
    await submitAction(action, activeRow.value, { params: paramRows.value });
  }
}

async function submitForm(action: ActionConfig) {
  const payload = formPayload();
  const create = page.value.create;
  loading.value = true;
  error.value = '';
  try {
    if (action.kind === 'create' && create) {
      await client.value.post(create.endpoint, payload);
    } else {
      await submitAction(action, activeRow.value, payload, false);
    }
    drawerOpen.value = false;
    showFeedback(label('保存成功', 'Saved'));
    await loadData();
  } catch (err) {
    setError(err);
  } finally {
    loading.value = false;
  }
}

async function submitImport(action: ActionConfig) {
  await submitAction(action, activeRow.value, {
    fileName: importFileName.value,
    importMode: importMode.value
  });
  drawerOpen.value = false;
  showFeedback(label('导入任务已创建', 'Import task created'));
}

async function submitPermission(action: ActionConfig) {
  const selected = Object.entries(permissionState)
    .filter(([, checked]) => checked)
    .map(([key]) => key);
  await submitAction(action, activeRow.value, { selectedPermissions: selected });
  drawerOpen.value = false;
  showFeedback(label('保存成功', 'Saved'));
}

async function submitMembers(action: ActionConfig) {
  const selectedUserIds = Object.entries(memberState)
    .filter(([, checked]) => checked)
    .map(([id]) => Number(id));
  const endpoint = action.endpoint ? resolveEndpoint(action.endpoint, activeRow.value) : '';
  loading.value = true;
  error.value = '';
  try {
    if (endpoint) {
      await client.value.post(endpoint, { userIds: selectedUserIds });
    } else {
      await submitAction(action, activeRow.value, { userIds: selectedUserIds }, false);
    }
    drawerOpen.value = false;
    showFeedback(label('保存成功', 'Saved'));
    await loadData();
  } catch (err) {
    setError(err);
  } finally {
    loading.value = false;
  }
}

async function submitAction(
  action: ActionConfig,
  row: Record<string, unknown> | null,
  payload: Record<string, unknown> = {},
  manageLoading = true
) {
  if (manageLoading) {
    loading.value = true;
    error.value = '';
  }
  try {
    const endpoint = action.endpoint ? resolveEndpoint(action.endpoint, row) : '';
    if (endpoint && shouldUseDirectEndpoint(action)) {
      await client.value.post(endpoint, payload);
    } else {
      await client.value.post(genericActionEndpoint(), {
        moduleCode: moduleCode(),
        actionCode: action.key,
        actionName: actionLabel(action),
        targetId: rowId(row),
        targetName: rowName(row),
        payload
      });
    }
    showFeedback(action.kind === 'export' ? label('已生成导出任务', 'Export task created') : label('操作已提交', 'Action submitted'));
  } finally {
    if (manageLoading) {
      loading.value = false;
    }
  }
}

function shouldUseDirectEndpoint(action: ActionConfig): boolean {
  return ['resetPassword', 'importStatTree', 'importStatParamRelations', 'configurePermissions', 'linkStatParams', 'disableTenant'].includes(action.key);
}

function genericActionEndpoint(): string {
  return page.value.routePath.startsWith('/platform/') ? '/platform/actions' : '/basic/actions';
}

function resolveEndpoint(endpoint: string, row: Record<string, unknown> | null): string {
  return endpoint.replace('{id}', String(row?.id ?? ''));
}

function moduleCode(): string {
  const prefix = page.value.routePath.startsWith('/platform/') ? 'platform' : 'basic';
  const raw = page.value.routePath.replace(/^\/(platform|basic)\//, '');
  const code = raw.split('/').filter(Boolean).map((part, index) => {
    if (index === 0) {
      return part;
    }
    return `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`;
  }).join('').replace(/-([a-z])/g, (_, char: string) => char.toUpperCase());
  return `${prefix}.${code}`;
}

function rowId(row: Record<string, unknown> | null): number | null {
  const id = row?.id;
  return typeof id === 'number' ? id : Number.isFinite(Number(id)) ? Number(id) : null;
}

function rowName(row: Record<string, unknown> | null): string {
  if (!row) {
    return label(page.value.titleZh, page.value.titleEn);
  }
  const keys = ['tenantName', 'username', 'nameZh', 'groupName', 'roleName', 'energyName', 'modelName', 'deviceName', 'statModelName', 'centerName', 'indicatorName', 'businessName', 'shiftName', 'dictName', 'orgName', 'account'];
  const key = keys.find((item) => row[item] !== undefined && row[item] !== null && row[item] !== '');
  return key ? String(row[key]) : String(row.id ?? label(page.value.titleZh, page.value.titleEn));
}

function formPayload(): Record<string, unknown> {
  return drawerFields.value.reduce<Record<string, unknown>>((payload, field) => {
    payload[field.key] = normalizeField(field, form[field.key]);
    return payload;
  }, {});
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

function setImportFile(event: Event) {
  const input = event.target as HTMLInputElement;
  importFileName.value = input.files?.[0]?.name ?? '';
}

function exportRows(action: ActionConfig) {
  const exportColumns = columns.value.filter((column) => column.type !== 'actions');
  const header = exportColumns.map((column) => label(column.labelZh, column.labelEn));
  const csvRows = rows.value.map((row) => exportColumns.map((column) => csvCell(displayValue(row, column.key, column.type))).join(','));
  const csv = ['\ufeff' + header.join(','), ...csvRows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${label(page.value.titleZh, page.value.titleEn)}-${action.key}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
  showFeedback(label('已生成导出任务', 'Export task created'));
}

function csvCell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

function showFeedback(message: string) {
  feedback.value = message;
  window.setTimeout(() => {
    if (feedback.value === message) {
      feedback.value = '';
    }
  }, 2600);
}

function setError(err: unknown) {
  error.value = err instanceof Error ? err.message : String(err);
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
        <button
          v-for="action in topActions"
          :key="action.key"
          type="button"
          :class="['ep-button', { primary: action.primary, danger: action.danger }]"
          @click="handleTopAction(action)"
        >
          <component :is="actionIcon(action)" :size="16" />
          {{ actionLabel(action) }}
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
    <div v-if="feedback" class="workspace-toast">{{ feedback }}</div>

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
            <td
              v-for="(column, colIndex) in columns"
              :key="column.key"
              :class="{ 'actions-cell': column.type === 'actions' }"
            >
              <span
                v-if="column.type === 'status'"
                :class="['ep-status', { disabled: statusDisabled(row, column.key) }]"
              >
                {{ displayValue(row, column.key, column.type) }}
              </span>
              <span v-else-if="column.type === 'actions'" class="row-actions">
                <button
                  v-for="action in rowActions"
                  :key="action.key"
                  type="button"
                  :class="['row-action', { danger: action.danger }]"
                  @click="handleRowAction(action, row)"
                >
                  {{ actionLabel(action) }}
                </button>
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

    <div v-if="drawerOpen" class="workspace-drawer">
      <form
        class="drawer-panel"
        :class="{ wide: drawerWide }"
        @submit.prevent="submitDrawer"
      >
        <header>
          <h3>{{ drawerTitle }}</h3>
          <button type="button" class="ep-button icon" @click="drawerOpen = false">
            <X :size="16" />
          </button>
        </header>

        <div v-if="drawerMode === 'form'" class="drawer-grid">
          <label v-for="field in drawerFields" :key="field.key" class="drawer-field">
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
        </div>

        <div v-else-if="drawerMode === 'detail'" class="detail-grid">
          <div v-for="item in detailItems" :key="item.key" class="detail-item">
            <span>{{ item.label }}</span>
            <strong>{{ item.value }}</strong>
          </div>
        </div>

        <div v-else-if="drawerMode === 'import'" class="drawer-grid">
          <label class="drawer-field full">
            <span>{{ label('导入文件', 'Import File') }}</span>
            <input class="ep-input" type="file" @change="setImportFile" />
            <small>{{ importFileName || label('请选择文件', 'Choose a file') }}</small>
          </label>
          <label class="drawer-field">
            <span>{{ label('导入模式', 'Import Mode') }}</span>
            <select v-model="importMode" class="ep-select">
              <option value="UPSERT">{{ label('新增和更新', 'Add and Update') }}</option>
              <option value="INSERT_ONLY">{{ label('仅新增', 'Add Only') }}</option>
              <option value="UPDATE_ONLY">{{ label('仅更新', 'Update Only') }}</option>
            </select>
          </label>
        </div>

        <div v-else-if="drawerMode === 'permission'" class="permission-grid">
          <section v-for="group in permissionGroups" :key="group.title" class="permission-box">
            <header>
              <span>{{ group.title }}</span>
              <button
                type="button"
                class="row-action"
                @click="group.items.forEach((item) => { permissionState[item.id] = true; })"
              >
                {{ label('全选', 'All') }}
              </button>
            </header>
            <label v-for="item in group.items" :key="item.id" class="check-row">
              <input v-model="permissionState[item.id]" type="checkbox" />
              <span>{{ item.label }}</span>
            </label>
          </section>
        </div>

        <div v-else-if="drawerMode === 'members'" class="permission-grid compact">
          <label v-for="item in memberCandidates" :key="item.id" class="check-row member-row">
            <input v-model="memberState[item.id]" type="checkbox" />
            <span>{{ item.label }}</span>
          </label>
        </div>

        <div v-else-if="drawerMode === 'params'" class="params-panel">
          <div class="params-toolbar">
            <button type="button" class="ep-button primary" @click="submitAction(activeAction!, activeRow, { addParam: true })">
              <Plus :size="16" />
              {{ label('新增参数', 'Add Param') }}
            </button>
          </div>
          <table v-if="paramRows.length" class="ep-table params-table">
            <thead>
              <tr>
                <th>{{ label('参数编码', 'Param Code') }}</th>
                <th>{{ label('参数名称', 'Param Name') }}</th>
                <th>{{ label('单位', 'Unit') }}</th>
                <th>{{ label('绑定点位', 'Bound Point') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="param in paramRows" :key="String(param.id)">
                <td>{{ displayValue(param, 'paramCode') }}</td>
                <td>{{ displayValue(param, 'paramName') }}</td>
                <td>{{ displayValue(param, 'unit') }}</td>
                <td>{{ displayValue(param, 'collectionPointName') }}</td>
              </tr>
            </tbody>
          </table>
          <div v-else class="ep-empty">{{ label('暂无参数', 'No params') }}</div>
        </div>

        <footer v-if="drawerMode !== 'detail'" class="drawer-footer">
          <button type="button" class="ep-button" @click="drawerOpen = false">{{ label('取消', 'Cancel') }}</button>
          <button class="ep-button primary" :disabled="loading">
            <Save :size="16" />
            {{ label('保存', 'Save') }}
          </button>
        </footer>
      </form>
    </div>
  </section>
</template>
