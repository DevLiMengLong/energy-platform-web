<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import EpSelect from '@energy-platform/shared/EpSelect.vue';
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
  ApiError,
  ApiClient,
  basicPages,
  findPage,
  formatCellValue,
  getEnumOptionsForField,
  pickLabel,
  platformPages,
  useResizableTableColumns,
  type ActionConfig,
  type ColumnConfig,
  type FormFieldConfig,
  type MicroAppContext,
  type PageResult
} from '@energy-platform/shared';

type DrawerMode =
  | 'form'
  | 'detail'
  | 'import'
  | 'permission'
  | 'members'
  | 'params'
  | 'batchConfirm'
  | 'move'
  | 'copyModel'
  | 'copyDevice'
  | 'statParam'
  | 'unitRelation'
  | 'capacityInput'
  | 'indicatorInput';
type SelectValue = string | number | boolean;
type SelectModelValue = SelectValue | SelectValue[];
type PermissionTreeNode = {
  id: string;
  label: string;
  children?: PermissionTreeNode[];
};
type PermissionPanel = {
  title: string;
  items: PermissionTreeNode[];
};
type DomainTreeNode = {
  id: string;
  label: string;
  active?: boolean;
  children?: DomainTreeNode[];
};
type DomainTreeRow = DomainTreeNode & {
  _level: number;
  _hasChildren: boolean;
};

const props = defineProps<{ context: MicroAppContext }>();
const pages = basicPages;
const pageSizeOptions = [10, 20, 50];
const IMPORT_FILE_MAX_BYTES = 20 * 1024 * 1024;
const pageNo = ref(1);
const size = ref(10);
const total = ref(0);
const rows = ref<Record<string, unknown>[]>([]);
const treeNodes = ref<Record<string, unknown>[]>([]);
const collapsedTreeRows = ref<string[]>([]);
const collapsedDomainTreeRows = ref<string[]>([]);
const selectedDomainTreeKey = ref('');
const loadRequestSeq = ref(0);
const loading = ref(false);
const error = ref('');
const feedback = ref('');
const drawerOpen = ref(false);
const drawerMode = ref<DrawerMode>('form');
const drawerFields = ref<FormFieldConfig[]>([]);
const activeAction = ref<ActionConfig | null>(null);
const activeRow = ref<Record<string, unknown> | null>(null);
const importMode = ref('UPSERT');
const importDuplicateMode = ref('OVERWRITE');
const importFileName = ref('');
const importFileSize = ref('');
const paramRows = ref<Record<string, unknown>[]>([]);
const permissionState = reactive<Record<string, boolean>>({});
const memberState = reactive<Record<string, boolean>>({});
const selectedRowKeys = ref<string[]>([]);
const selectedStatParamKeys = ref<string[]>([]);
const selectedRelationKeys = ref<string[]>([]);
const moveForm = reactive({ nodeKey: '', targetParentKey: '', sortOrder: 1 });
const orgMoveSearch = ref('');
const selectedOrgKey = ref('');
const copyForm = reactive({ sourceKey: '', newCode: '', newName: '', copyParams: true, copyPoints: false });
const inputForm = reactive({ target: '', periodType: 'MONTH', dataTime: '', value: '', unit: '' });
const domainContext = reactive<Record<string, string | number | boolean>>({});
const filters = reactive<Record<string, string>>({});
const form = reactive<Record<string, string | number | boolean | null | Array<string | number | boolean>>>({});
const relationOptionCache = new Map<string, Array<{ labelZh: string; labelEn: string; value: string | number | boolean }>>();
const page = computed(() => findPage(pages, props.context.routePath));
const columns = computed(() => page.value.columns ?? []);
const mainTableColumns = useResizableTableColumns({
  columns,
  storageKey: computed(() => `energy-platform:table-widths:${page.value.routePath}:main`)
});
const orgMemberColumns = computed<ColumnConfig[]>(() => [
  { key: 'account', labelZh: '账号', labelEn: 'Account', width: '170px' },
  { key: 'username', labelZh: '姓名', labelEn: 'Name', width: '150px' },
  { key: 'phone', labelZh: '手机号', labelEn: 'Phone', width: '160px' },
  { key: 'email', labelZh: '邮箱', labelEn: 'Email', width: '220px' },
  { key: 'roleName', labelZh: '角色', labelEn: 'Role', width: '140px' },
  { key: 'status', labelZh: '状态', labelEn: 'Status', type: 'status', width: '112px' },
  { key: '_actions', labelZh: '操作', labelEn: 'Actions', type: 'actions', width: '220px' }
]);
const orgMemberTableColumns = useResizableTableColumns({
  columns: orgMemberColumns,
  storageKey: computed(() => `energy-platform:table-widths:${page.value.routePath}:org-members`)
});
const paramColumns = computed<ColumnConfig[]>(() => [
  { key: 'paramCode', labelZh: '参数编码', labelEn: 'Param Code' },
  { key: 'paramName', labelZh: '参数名称', labelEn: 'Param Name' },
  { key: 'unit', labelZh: '单位', labelEn: 'Unit' },
  { key: 'collectionPointName', labelZh: '绑定点位', labelEn: 'Bound Point' }
]);
const paramTableColumns = useResizableTableColumns({
  columns: paramColumns,
  storageKey: computed(() => `energy-platform:table-widths:${page.value.routePath}:params`)
});
const filterConfigs = computed(() => page.value.filters ?? []);
const pageCount = computed(() => Math.max(1, Math.ceil(total.value / size.value)));
const topActions = computed(() => page.value.topActions ?? []);
const rowActions = computed(() => page.value.rowActions ?? []);
const hasSelectionColumn = computed(() => topActions.value.some((action) => action.requiresSelection));
const isOrgManagementPage = computed(() => page.value.routePath === '/basic/org-nodes');
const selectedRows = computed(() => rows.value.filter((row) => selectedRowKeys.value.includes(rowKey(row))));
const allPageRowsSelected = computed(() => rows.value.length > 0 && rows.value.every((row) => selectedRowKeys.value.includes(rowKey(row))));
const partiallySelected = computed(() => selectedRowKeys.value.length > 0 && !allPageRowsSelected.value);
const isDomainLayoutPage = computed(() => ['/basic/stat-models', '/basic/capacity-centers', '/basic/unit-consumption', '/basic/indicators'].includes(page.value.routePath));
const orgDialogMode = computed(() => isOrgManagementPage.value && ['form', 'import', 'move'].includes(drawerMode.value));
const drawerTitle = computed(() => {
  if (activeAction.value) {
    return actionLabel(activeAction.value);
  }
  return label(page.value.titleZh, page.value.titleEn);
});
const drawerWide = computed(() => ['detail', 'permission', 'members', 'params', 'move', 'statParam', 'unitRelation', 'capacityInput', 'indicatorInput'].includes(drawerMode.value));
const detailItems = computed(() => {
  const row = activeRow.value ?? {};
  const detailColumns = isOrgManagementPage.value && isOrgMemberRow(row) ? orgMemberColumns.value : columns.value;
  return detailColumns
    .filter((column) => column.type !== 'actions')
    .map((column) => ({
      key: column.key,
      label: label(column.labelZh, column.labelEn),
      value: displayValue(row, column.key, column.type)
    }));
});
const permissionPanels = computed(() => permissionCatalog(activeAction.value?.key));
const permissionTargetFields = computed(() => buildPermissionTargetFields());
const domainTreeNodes = computed(() => domainTreeForRoute(page.value.routePath));
const domainTreeRows = computed(() => flattenDomainTree(domainTreeNodes.value));
const domainContextFields = computed(() => domainContextForRoute(page.value.routePath));
const orgTreeRows = computed(() => flattenTree(treeNodes.value));
const orgMoveRows = computed(() => {
  const keyword = orgMoveSearch.value.trim().toLowerCase();
  const allRows = flattenTreeRowsWithLevel(treeNodes.value);
  if (!keyword) {
    return allRows;
  }
  return allRows.filter((row) => [row.orgName, row.orgCode, row.name, row.code]
    .filter((value) => value !== undefined && value !== null)
    .some((value) => String(value).toLowerCase().includes(keyword)));
});
const orgMemberActions = computed<ActionConfig[]>(() => [
  { key: 'editOrgMember', labelZh: '编辑', labelEn: 'Edit', kind: 'edit' },
  { key: 'detailOrgMember', labelZh: '详情', labelEn: 'Detail', kind: 'detail' },
  { key: 'disableOrgMember', labelZh: '停用', labelEn: 'Disable', kind: 'disable', danger: true }
]);
const statParamRows = computed(() => buildStatParamRows());
const relationItems = computed(() => buildCapacityRelationItems());
const memberCandidates = computed(() => [
  { id: '1', label: label('能源主管', 'Energy Manager') },
  { id: '2', label: label('设备维护', 'Device Operator') },
  { id: '3', label: label('报表查看', 'Report Viewer') },
  { id: '4', label: label('园区运营', 'Plant Operator') }
]);
const client = computed(() => new ApiClient(props.context.apiBase, () => props.context.token));

const listOnlyFormFieldKeys = new Set([
  'lastLoginAt',
  'createdAt',
  'updatedAt',
  'initStatus',
  'memberCount',
  'userCount',
  'itemCount',
  'paramCount',
  'permissionCount',
  'sourceType',
  'subsystemNames',
  'subsystemCodes',
  'authStatus'
]);

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

function rowAction(action: ActionConfig, row: Record<string, unknown>): ActionConfig {
  const status = String(row.status ?? '').toUpperCase();
  if (action.kind === 'disable' && status === 'DISABLED') {
    return {
      ...action,
      key: action.key.toLowerCase().includes('disable') ? action.key.replace(/disable/i, 'enable') : `enable-${action.key}`,
      labelZh: '启用',
      labelEn: 'Enable',
      kind: 'enable',
      danger: false,
      endpoint: undefined
    };
  }
  if (action.kind === 'enable' && status === 'ENABLED') {
    return {
      ...action,
      key: action.key.toLowerCase().includes('enable') ? action.key.replace(/enable/i, 'disable') : `disable-${action.key}`,
      labelZh: '停用',
      labelEn: 'Disable',
      kind: 'disable',
      danger: true,
      endpoint: undefined
    };
  }
  return action;
}

function rowActionLabel(action: ActionConfig, row: Record<string, unknown>): string {
  return actionLabel(rowAction(action, row));
}

function actionIcon(action: ActionConfig) {
  return actionIcons[action.kind] ?? Settings;
}

function optionLabel(options: Array<{ labelZh: string; labelEn: string; value: string | number | boolean }> = []) {
  return options.map((option) => ({
    label: label(option.labelZh, option.labelEn),
    value: option.value
  }));
}

function pageSizeSelectOptions() {
  return pageSizeOptions.map((option) => ({
    label: `${option} ${label('条/页', '/ page')}`,
    value: option
  }));
}

function importModeOptions() {
  return [
    { label: label('新增和更新', 'Add and Update'), value: 'UPSERT' },
    { label: label('仅新增', 'Add Only'), value: 'INSERT_ONLY' },
    { label: label('仅更新', 'Update Only'), value: 'UPDATE_ONLY' }
  ];
}

function rowKey(row: Record<string, unknown>): string {
  return String(row.id ?? row.tenantMark ?? row.account ?? row.groupCode ?? row.roleCode ?? row.orgCode ?? row.code ?? rowName(row));
}

function permissionCatalog(actionKey?: string): PermissionPanel[] {
  const subsystemNodes: PermissionTreeNode[] = [
    { id: 'subsystem-platform', label: label('平台管理', 'Platform Admin') },
    { id: 'subsystem-basic', label: label('基础信息', 'Basic Info') },
    { id: 'subsystem-collection', label: label('数据采集', 'Data Collection') },
    { id: 'subsystem-report', label: label('报表分析', 'Reports') },
    { id: 'subsystem-dashboard', label: label('数据看板', 'Dashboard') }
  ];
  const platformMenuRoot: PermissionTreeNode = {
    id: 'menu-root-platform',
    label: label('平台管理', 'Platform Admin'),
    children: buildMenuPermissionNodes('platform', platformPages)
  };
  const basicMenuRoot: PermissionTreeNode = {
    id: 'menu-root-basic',
    label: label('基础信息', 'Basic Info'),
    children: buildMenuPermissionNodes('basic', basicPages)
  };
  const platformButtonRoot: PermissionTreeNode = {
    id: 'button-root-platform',
    label: label('平台管理', 'Platform Admin'),
    children: buildButtonPermissionNodes('platform', platformPages)
  };
  const basicButtonRoot: PermissionTreeNode = {
    id: 'button-root-basic',
    label: label('基础信息', 'Basic Info'),
    children: buildButtonPermissionNodes('basic', basicPages)
  };
  if (actionKey === 'configurePermissions') {
    return [
      { title: label('菜单权限', 'Menu Permissions'), items: [basicMenuRoot] },
      { title: label('按钮权限', 'Button Permissions'), items: [basicButtonRoot] }
    ];
  }
  return [
    { title: label('子系统权限', 'Subsystem Permissions'), items: subsystemNodes },
    { title: label('子系统菜单权限', 'Subsystem Menus'), items: [platformMenuRoot, basicMenuRoot] },
    { title: label('子系统按钮权限', 'Subsystem Buttons'), items: [platformButtonRoot, basicButtonRoot] }
  ];
}

function buildMenuPermissionNodes(prefix: string, menuPages: typeof basicPages): PermissionTreeNode[] {
  return menuPages.map((item) => ({
    id: `menu-${prefix}-${item.routePath}`,
    label: label(item.titleZh, item.titleEn)
  }));
}

function buildButtonPermissionNodes(prefix: string, menuPages: typeof basicPages): PermissionTreeNode[] {
  return menuPages
    .map((item) => {
      const actions = [...(item.topActions ?? []), ...(item.rowActions ?? [])];
      const uniqueActions = Array.from(new Map(actions.map((action) => [action.key, action])).values());
      return {
        id: `button-menu-${prefix}-${item.routePath}`,
        label: label(item.titleZh, item.titleEn),
        children: uniqueActions.map((action) => ({
          id: `button-${prefix}-${item.routePath}-${action.key}`,
          label: `${actionLabel(action)} / ${action.key}`
        }))
      };
    })
    .filter((item) => item.children.length);
}

function flattenPermissionNodes(nodes: PermissionTreeNode[]): PermissionTreeNode[] {
  return nodes.flatMap((item) => [item, ...flattenPermissionNodes(item.children ?? [])]);
}

function flattenPermissionPanels(panels: PermissionPanel[] = permissionPanels.value): PermissionTreeNode[] {
  return panels.flatMap((panel) => flattenPermissionNodes(panel.items));
}

function setPermissionNodeChecked(node: PermissionTreeNode, checked: boolean) {
  flattenPermissionNodes([node]).forEach((item) => {
    permissionState[item.id] = checked;
  });
}

function setPermissionPanelChecked(panel: PermissionPanel, checked: boolean) {
  flattenPermissionNodes(panel.items).forEach((item) => {
    permissionState[item.id] = checked;
  });
}

function checkedFromEvent(event: Event): boolean {
  return (event.target as HTMLInputElement).checked;
}

function buildPermissionTargetFields() {
  const row = activeRow.value ?? {};
  if (activeAction.value?.key === 'assignTenantPermissions') {
    return [
      { label: label('租户标识', 'Tenant Mark'), value: String(row.tenantMark ?? '') },
      { label: label('租户名称', 'Tenant Name'), value: String(row.tenantName ?? '') }
    ];
  }
  if (activeAction.value?.key === 'configurePermissions') {
    return [
      { label: label('角色编码', 'Role Code'), value: String(row.roleCode ?? '') },
      { label: label('角色名称', 'Role Name'), value: String(row.roleName ?? '') }
    ];
  }
  return [
    { label: label('对象标识', 'Target Key'), value: rowKey(row) },
    { label: label('对象名称', 'Target Name'), value: rowName(row) }
  ];
}

function domainTreeTitle(routePath: string): string {
  if (routePath.includes('capacity-centers')) {
    return label('产能中心树', 'Capacity Tree');
  }
  if (routePath.includes('unit-consumption')) {
    return label('单耗配置树', 'Unit Consumption Tree');
  }
  if (routePath.includes('indicators')) {
    return label('指标配置树', 'Indicator Tree');
  }
  return label('统计模型树', 'Stat Model Tree');
}

function domainTreeForRoute(routePath: string): DomainTreeNode[] {
  if (routePath.includes('capacity-centers')) {
    return [
      {
        id: 'capacity-root',
        label: label('深圳园区', 'Shenzhen Plant'),
        active: true,
        children: [
          { id: 'capacity-workshop-1', label: label('一号车间', 'Workshop 1') },
          {
            id: 'capacity-device',
            label: label('设备部', 'Equipment Department'),
            children: [
              { id: 'capacity-line-a', label: label('A 产线', 'Line A') },
              { id: 'capacity-line-b', label: label('B 产线', 'Line B') }
            ]
          },
          { id: 'capacity-workshop-2', label: label('二号车间', 'Workshop 2') }
        ]
      }
    ];
  }
  if (routePath.includes('unit-consumption')) {
    return [
      {
        id: 'unit-root',
        label: label('全厂单耗', 'Plant Unit Consumption'),
        active: true,
        children: [
          {
            id: 'unit-workshop-1',
            label: label('一号车间单耗', 'Workshop 1 Consumption'),
            children: [
              { id: 'unit-line-a', label: label('A 产线单耗', 'Line A Consumption') },
              { id: 'unit-line-b', label: label('B 产线单耗', 'Line B Consumption') }
            ]
          }
        ]
      }
    ];
  }
  if (routePath.includes('indicators')) {
    return [
      {
        id: 'indicator-root',
        label: label('全厂指标', 'Plant Indicators'),
        active: true,
        children: [
          { id: 'indicator-energy', label: label('能源指标', 'Energy Indicators') },
          { id: 'indicator-output', label: label('产能指标', 'Capacity Indicators') }
        ]
      }
    ];
  }
  return [
    {
      id: 'stat-root',
      label: label('全厂用电', 'Plant Electricity'),
      active: true,
      children: [
        {
          id: 'stat-workshop-1',
          label: label('一号车间用电', 'Workshop 1 Electricity'),
          children: [
            { id: 'stat-line-a', label: label('A 产线用电', 'Line A Electricity') },
            { id: 'stat-line-b', label: label('B 产线用电', 'Line B Electricity') }
          ]
        }
      ]
    }
  ];
}

function flattenDomainTree(nodes: DomainTreeNode[], level = 0): DomainTreeRow[] {
  return nodes.flatMap((node) => {
    const children = node.children ?? [];
    const row: DomainTreeRow = { ...node, _level: level, _hasChildren: children.length > 0 };
    if (collapsedDomainTreeRows.value.includes(domainTreeNodeKey(node))) {
      return [row];
    }
    return [row, ...flattenDomainTree(children, level + 1)];
  });
}

function domainTreeNodeKey(node: DomainTreeNode): string {
  return String(node.id);
}

function defaultDomainTreeKey(nodes: DomainTreeNode[]): string {
  const active = findDomainTreeNode(nodes, (node) => Boolean(node.active));
  return active?.id ?? nodes[0]?.id ?? '';
}

function findDomainTreeNode(nodes: DomainTreeNode[], predicate: (node: DomainTreeNode) => boolean): DomainTreeNode | null {
  for (const node of nodes) {
    if (predicate(node)) {
      return node;
    }
    const child = findDomainTreeNode(node.children ?? [], predicate);
    if (child) {
      return child;
    }
  }
  return null;
}

function isDomainTreeActive(node: DomainTreeNode): boolean {
  const selectedKey = findDomainTreeNode(domainTreeNodes.value, (item) => item.id === selectedDomainTreeKey.value)
    ? selectedDomainTreeKey.value
    : defaultDomainTreeKey(domainTreeNodes.value);
  return domainTreeNodeKey(node) === selectedKey;
}

function selectDomainTreeNode(node: DomainTreeNode) {
  selectedDomainTreeKey.value = domainTreeNodeKey(node);
}

function toggleDomainTreeNode(node: DomainTreeRow) {
  if (!node._hasChildren) {
    return;
  }
  const key = domainTreeNodeKey(node);
  collapsedDomainTreeRows.value = collapsedDomainTreeRows.value.includes(key)
    ? collapsedDomainTreeRows.value.filter((item) => item !== key)
    : [...collapsedDomainTreeRows.value, key];
}

function domainTreeNodeStyle(node: DomainTreeRow): Record<string, string> {
  return { paddingLeft: `${node._level * 18 + 8}px` };
}

function domainContextForRoute(routePath: string) {
  const energyOptions = [
    { label: label('电', 'Electricity'), value: 'electricity' },
    { label: label('水', 'Water'), value: 'water' },
    { label: label('天然气', 'Gas'), value: 'gas' }
  ];
  const modelOptions = [
    { label: label('园区能源统计模型', 'Plant Energy Stat Model'), value: 'plant' },
    { label: label('产线统计模型', 'Line Stat Model'), value: 'line' }
  ];
  const periodOptions = [
    { label: label('月', 'Month'), value: 'MONTH' },
    { label: label('日', 'Day'), value: 'DAY' },
    { label: label('小时', 'Hour'), value: 'HOUR' }
  ];
  if (routePath.includes('capacity-centers')) {
    return [
      { key: 'capacityType', label: label('数据类型', 'Data Type'), value: 'OUTPUT', options: [{ label: label('产量', 'Output'), value: 'OUTPUT' }, { label: label('产值', 'Output Value'), value: 'VALUE' }] },
      { key: 'capacityPeriod', label: label('维护维度', 'Period'), value: 'MONTH', options: periodOptions }
    ];
  }
  if (routePath.includes('unit-consumption')) {
    return [
      { key: 'energyType', label: label('能源类型', 'Energy Type'), value: 'electricity', options: energyOptions },
      { key: 'statModel', label: label('统计模型', 'Stat Model'), value: 'plant', options: modelOptions }
    ];
  }
  if (routePath.includes('indicators')) {
    return [
      { key: 'energyType', label: label('能源类型', 'Energy Type'), value: 'electricity', options: energyOptions },
      { key: 'statModel', label: label('统计模型', 'Stat Model'), value: 'plant', options: modelOptions },
      { key: 'indicatorType', label: label('指标类型', 'Indicator Type'), value: 'FIXED', options: [{ label: label('固定指标', 'Fixed Indicator'), value: 'FIXED' }, { label: label('过程指标', 'Process Indicator'), value: 'PROCESS' }] }
    ];
  }
  return [
    { key: 'energyType', label: label('能源类型', 'Energy Type'), value: 'electricity', options: energyOptions },
    { key: 'statModel', label: label('统计模型', 'Stat Model'), value: 'plant', options: modelOptions }
  ];
}

function domainContextValue(field: { key: string; value: string | number | boolean }) {
  return domainContext[field.key] ?? field.value;
}

function setDomainContextValue(key: string, value: SelectModelValue) {
  domainContext[key] = Array.isArray(value) ? String(value[0] ?? '') : value;
}

function buildStatParamRows() {
  return Array.from({ length: 8 }, (_, index) => ({
    id: `stat-param-${index + 1}`,
    paramName: `${label('电表参数', 'Meter Param')}${index + 1}`,
    paramCode: `P_ENERGY_${String(index + 1).padStart(2, '0')}`,
    unit: index % 2 === 0 ? 'kWh' : 'kW',
    collectionModel: index % 2 === 0 ? label('电表采集模型', 'Meter Model') : label('空压机采集模型', 'Compressor Model'),
    deviceName: `${label('设备', 'Device')}${index + 1}`,
    pointName: `POINT_${String(index + 1).padStart(2, '0')}`,
    status: index < 3 ? 'BOUND' : 'UNBOUND'
  }));
}

function buildCapacityRelationItems() {
  return [
    { id: 'cap-1', label: label('电芯产线产量', 'Cell line output') },
    { id: 'cap-2', label: label('模组产线产量', 'Module line output') },
    { id: 'cap-3', label: label('PACK 产线产值', 'PACK output value') },
    { id: 'cap-4', label: label('园区人数', 'Plant people count') }
  ];
}

async function loadData() {
  const requestSeq = loadRequestSeq.value + 1;
  loadRequestSeq.value = requestSeq;
  loading.value = true;
  error.value = '';
  try {
    if (isOrgManagementPage.value) {
      await loadOrgManagementData(requestSeq);
      return;
    }
    if (page.value.mode === 'tree' || page.value.mode === 'treeTable') {
      const nodes = await client.value.get<Record<string, unknown>[]>(page.value.endpoint, activeFilterParams());
      if (requestSeq !== loadRequestSeq.value) {
        return;
      }
      treeNodes.value = nodes;
      applyTreePagination();
    } else {
      const data = await client.value.get<PageResult>(page.value.endpoint, {
        ...activeFilterParams(),
        page: pageNo.value,
        size: size.value
      });
      if (requestSeq !== loadRequestSeq.value) {
        return;
      }
      rows.value = data.rows;
      total.value = data.total;
      pruneSelectedRows();
    }
  } catch (err) {
    if (requestSeq === loadRequestSeq.value) {
      error.value = friendlyError(err);
    }
  } finally {
    if (requestSeq === loadRequestSeq.value) {
      loading.value = false;
    }
  }
}

async function loadOrgManagementData(requestSeq: number) {
  const [nodes, users] = await Promise.all([
    client.value.get<Record<string, unknown>[]>(page.value.endpoint, activeFilterParams()),
    client.value.get<PageResult<Record<string, unknown>>>('/basic/users', {
      keyword: filters.keyword || undefined,
      page: pageNo.value,
      size: size.value
    })
  ]);
  if (requestSeq !== loadRequestSeq.value) {
    return;
  }
  treeNodes.value = nodes;
  if (!selectedOrgKey.value && nodes.length) {
    selectedOrgKey.value = treeRowKey(nodes[0]);
  }
  rows.value = users.rows.map((row) => ({ ...row, _orgMember: true }));
  total.value = users.total;
  pruneSelectedRows();
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

function flattenTreeRowsWithLevel(rows: Record<string, unknown>[], level = 0): Record<string, unknown>[] {
  return rows.flatMap((row) => {
    const children = Array.isArray(row.children) ? row.children as Record<string, unknown>[] : [];
    return [
      { ...row, _level: level, _hasChildren: children.length > 0 },
      ...flattenTreeRowsWithLevel(children, level + 1)
    ];
  });
}

function selectOrgNode(row: Record<string, unknown>) {
  selectedOrgKey.value = treeRowKey(row);
}

function isOrgSelected(row: Record<string, unknown>): boolean {
  return selectedOrgKey.value === treeRowKey(row);
}

function isOrgMemberRow(row: Record<string, unknown> | null): boolean {
  return Boolean(row?._orgMember || (row && 'account' in row && 'username' in row));
}

function orgMemberFormFields(): FormFieldConfig[] {
  return [
    { key: 'account', labelZh: '账号', labelEn: 'Account', required: true },
    { key: 'username', labelZh: '姓名', labelEn: 'Name', required: true },
    { key: 'phone', labelZh: '手机号', labelEn: 'Phone' },
    { key: 'email', labelZh: '邮箱', labelEn: 'Email' },
    { key: 'roleName', labelZh: '角色', labelEn: 'Role', multiple: true },
    { key: 'orgName', labelZh: '所属组织', labelEn: 'Org' },
    { key: 'status', labelZh: '状态', labelEn: 'Status' }
  ];
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
  pruneSelectedRows();
}

function valueFromInput(value: Event | SelectModelValue) {
  if (value instanceof Event) {
    return (value.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement).value;
  }
  return value;
}

function setFilterValue(key: string, value: Event | SelectModelValue) {
  filters[key] = String(valueFromInput(value));
}

function searchTable() {
  if (loading.value) {
    return;
  }
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
  if (loading.value) {
    return;
  }
  const target = Math.min(Math.max(nextPage, 1), pageCount.value);
  if (target === pageNo.value) {
    return;
  }
  pageNo.value = target;
  if (isOrgManagementPage.value) {
    loadData();
  } else if (page.value.mode === 'tree' || page.value.mode === 'treeTable') {
    applyTreePagination();
  } else {
    loadData();
  }
}

function changePageSize(value: Event | SelectModelValue) {
  if (loading.value) {
    return;
  }
  size.value = Number(valueFromInput(value));
  pageNo.value = 1;
  if (isOrgManagementPage.value) {
    loadData();
  } else if (page.value.mode === 'tree' || page.value.mode === 'treeTable') {
    applyTreePagination();
  } else {
    loadData();
  }
}

function pruneSelectedRows() {
  const visibleKeys = new Set(rows.value.map(rowKey));
  selectedRowKeys.value = selectedRowKeys.value.filter((key) => visibleKeys.has(key));
}

function toggleRowSelection(row: Record<string, unknown>, checked: boolean) {
  const key = rowKey(row);
  selectedRowKeys.value = checked
    ? Array.from(new Set([...selectedRowKeys.value, key]))
    : selectedRowKeys.value.filter((item) => item !== key);
}

function toggleAllPageRows(checked: boolean) {
  const visibleKeys = rows.value.map(rowKey);
  selectedRowKeys.value = checked
    ? Array.from(new Set([...selectedRowKeys.value, ...visibleKeys]))
    : selectedRowKeys.value.filter((key) => !visibleKeys.includes(key));
}

function handleTopAction(action: ActionConfig) {
  handleAction(action, null);
}

function handleRowAction(action: ActionConfig, row: Record<string, unknown>) {
  handleAction(rowAction(action, row), row);
}

function handleOrgMemberAction(action: ActionConfig, row: Record<string, unknown>) {
  handleAction(rowAction(action, row), row);
}

function handleAction(action: ActionConfig, row: Record<string, unknown> | null) {
  if (loading.value) {
    return;
  }
  activeAction.value = action;
  activeRow.value = row;
  error.value = '';
  if (action.requiresSelection && !row && selectedRows.value.length === 0) {
    error.value = label('请先选择表格记录', 'Please select table records first');
    return;
  }
  if (action.kind === 'export') {
    handleExport(action, row).catch(setError);
    return;
  }
  if (action.kind === 'permission' || action.kind === 'assign') {
    if (action.requiresSelection && !row && selectedRows.value.length > 1) {
      error.value = label('权限分配一次只能选择一条记录', 'Select exactly one record for permission assignment');
      return;
    }
    openPermission(action, row ?? selectedRows.value[0] ?? null);
    return;
  }
  if (action.kind === 'copy' && action.requiresSelection) {
    if (!row && selectedRows.value.length > 1) {
      error.value = label('复制操作一次只能选择一条记录', 'Select exactly one record for copy');
      return;
    }
    openForm(action, row ?? selectedRows.value[0] ?? null, false);
    return;
  }
  if (action.requiresSelection || ['disable', 'enable', 'delete', 'resetPassword', 'unlink'].includes(action.kind)) {
    openBatchConfirm(action, row);
    return;
  }
  if (action.kind === 'import') {
    openImport(action, row);
    return;
  }
  if (action.key === 'moveOrgNodes') {
    openMove(action, row);
    return;
  }
  if (action.key === 'copyDeviceModel') {
    openCopyModel(action, row);
    return;
  }
  if (action.key === 'copyDevice') {
    openCopyDevice(action, row);
    return;
  }
  if (action.key === 'manualStatParamRelation' || action.key === 'linkStatParams') {
    openStatParamRelation(action, row);
    return;
  }
  if (action.key === 'createUnitConsumption' || action.key === 'edit') {
    if (page.value.routePath.includes('/unit-consumption')) {
      openUnitRelation(action, row);
      return;
    }
  }
  if (action.key === 'inputCapacity') {
    openCapacityInput(action, row);
    return;
  }
  if (action.key === 'inputIndicator' || action.key === 'createIndicator') {
    openIndicatorInput(action, row);
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
  const fields = isOrgManagementPage.value && row && isOrgMemberRow(row) && !forceCreate
    ? orgMemberFormFields()
    : forceCreate && create ? create.fields : page.value.edit?.fields ?? inferFormFields(action);
  drawerFields.value = prepareFormFields(fields);
  resetForm(drawerFields.value, forceCreate ? null : row);
  drawerOpen.value = true;
  hydrateRelationFields(forceCreate ? null : row).catch(setError);
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
  importDuplicateMode.value = 'OVERWRITE';
  importFileName.value = '';
  importFileSize.value = '';
  drawerMode.value = 'import';
  drawerOpen.value = true;
}

function openBatchConfirm(action: ActionConfig, row: Record<string, unknown> | null) {
  activeAction.value = action;
  activeRow.value = row;
  if (!row && selectedRows.value.length === 0) {
    error.value = label('请先选择表格记录', 'Please select table records first');
    return;
  }
  drawerMode.value = 'batchConfirm';
  drawerOpen.value = true;
}

function openMove(action: ActionConfig, row: Record<string, unknown> | null) {
  const candidates = isOrgManagementPage.value ? flattenTreeRowsWithLevel(treeNodes.value) : rows.value;
  const candidate = row ?? selectedRows.value[0] ?? candidates[0] ?? null;
  activeAction.value = action;
  activeRow.value = candidate;
  moveForm.nodeKey = candidate ? rowKey(candidate) : '';
  moveForm.targetParentKey = candidates.find((item) => rowKey(item) !== moveForm.nodeKey) ? rowKey(candidates.find((item) => rowKey(item) !== moveForm.nodeKey)!) : '';
  moveForm.sortOrder = Number(candidate?.sortOrder ?? 1);
  orgMoveSearch.value = '';
  drawerMode.value = 'move';
  drawerOpen.value = true;
}

function openCopyModel(action: ActionConfig, row: Record<string, unknown> | null) {
  const source = row ?? rows.value[0] ?? null;
  activeAction.value = action;
  activeRow.value = source;
  copyForm.sourceKey = source ? rowKey(source) : '';
  copyForm.newCode = `${String(source?.modelCode ?? 'MODEL')}_COPY`;
  copyForm.newName = `${String(source?.modelName ?? label('新模型', 'New Model'))}${label('副本', ' Copy')}`;
  copyForm.copyParams = true;
  copyForm.copyPoints = false;
  drawerMode.value = 'copyModel';
  drawerOpen.value = true;
}

function openCopyDevice(action: ActionConfig, row: Record<string, unknown> | null) {
  const source = row ?? rows.value[0] ?? null;
  activeAction.value = action;
  activeRow.value = source;
  copyForm.sourceKey = source ? rowKey(source) : '';
  copyForm.newCode = `${String(source?.deviceCode ?? 'DEVICE')}_COPY`;
  copyForm.newName = `${String(source?.deviceName ?? label('新设备', 'New Device'))}${label('副本', ' Copy')}`;
  copyForm.copyParams = true;
  copyForm.copyPoints = true;
  drawerMode.value = 'copyDevice';
  drawerOpen.value = true;
}

function openStatParamRelation(action: ActionConfig, row: Record<string, unknown> | null) {
  activeAction.value = action;
  activeRow.value = row;
  selectedStatParamKeys.value = statParamRows.value.filter((item) => item.status === 'BOUND').map((item) => String(item.id));
  drawerMode.value = 'statParam';
  drawerOpen.value = true;
}

function openUnitRelation(action: ActionConfig, row: Record<string, unknown> | null) {
  activeAction.value = action;
  activeRow.value = row;
  selectedRelationKeys.value = relationItems.value.slice(0, 2).map((item) => item.id);
  drawerMode.value = 'unitRelation';
  drawerOpen.value = true;
}

function openCapacityInput(action: ActionConfig, row: Record<string, unknown> | null) {
  activeAction.value = action;
  activeRow.value = row;
  inputForm.target = String(row?.centerName ?? label('电芯产线', 'Cell Line'));
  inputForm.periodType = 'MONTH';
  inputForm.dataTime = '2026-05';
  inputForm.value = String(row?.dataValue ?? '');
  inputForm.unit = String(row?.unit ?? '件');
  drawerMode.value = 'capacityInput';
  drawerOpen.value = true;
}

function openIndicatorInput(action: ActionConfig, row: Record<string, unknown> | null) {
  activeAction.value = action;
  activeRow.value = row;
  inputForm.target = String(row?.indicatorName ?? label('综合能耗', 'Total Energy'));
  inputForm.periodType = 'MONTH';
  inputForm.dataTime = '2026-05';
  inputForm.value = String(row?.indicatorValue ?? '');
  inputForm.unit = String(row?.unit ?? 'kWh');
  drawerMode.value = 'indicatorInput';
  drawerOpen.value = true;
}

function openPermission(action: ActionConfig, row: Record<string, unknown> | null) {
  activeAction.value = action;
  activeRow.value = row;
  Object.keys(permissionState).forEach((key) => delete permissionState[key]);
  flattenPermissionPanels().forEach((item) => {
    permissionState[item.id] = true;
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
    .filter((column) => !listOnlyFormFieldKeys.has(column.key))
    .slice(0, 8)
    .map(fieldFromColumn);
}

function fieldFromColumn(column: ColumnConfig): FormFieldConfig {
  const matchingFilter = filterConfigs.value.find((filter) => filter.key === column.key && filter.type === 'select' && filter.options?.length);
  const relationSource = relationSourceForField(column.key);
  const relationOptions = relationSource ? (relationOptionCache.get(relationSource.cacheKey) ?? []) : [];
  const selectOptions = relationSource
    ? relationOptions
    : matchingFilter?.options?.filter((option) => option.value !== '') ?? getEnumOptionsForField(column.key);
  if (selectOptions.length) {
    return {
      key: column.key,
      labelZh: column.labelZh,
      labelEn: column.labelEn,
      type: 'select',
      options: selectOptions
    };
  }
  return {
    key: column.key,
    labelZh: column.labelZh,
    labelEn: column.labelEn,
    type: column.type === 'number' ? 'number' : column.type === 'boolean' || column.type === 'visibility' ? 'boolean' : 'text'
  };
}

function prepareFormFields(fields: FormFieldConfig[]): FormFieldConfig[] {
  return fields.map((field) => {
    const relationSource = relationSourceForField(field.key);
    if (relationSource) {
      return {
        ...field,
        type: 'select',
        options: relationOptionCache.get(relationSource.cacheKey) ?? field.options ?? []
      };
    }
    const enumOptions = field.options ?? getEnumOptionsForField(field.key);
    if (enumOptions.length) {
      return {
        ...field,
        type: 'select',
        options: enumOptions
      };
    }
    return field;
  });
}

function resetForm(fields: FormFieldConfig[], row: Record<string, unknown> | null) {
  Object.keys(form).forEach((key) => delete form[key]);
  fields.forEach((field) => {
    if (field.type === 'boolean') {
      form[field.key] = row ? Boolean(Number(row[field.key] ?? 0)) : false;
    } else if (field.multiple) {
      const rawValue = row?.[field.key];
      form[field.key] = rawValue ? String(rawValue).split(',').map((item) => item.trim()).filter(Boolean) : [];
    } else {
      form[field.key] = row ? String(row[field.key] ?? '') : '';
    }
  });
}

type RelationOptionSource = {
  cacheKey: string;
  endpoint: string;
  responseType: 'page' | 'tree';
  valueKey: string;
  labelKeys: string[];
  activeOnly?: boolean;
};

function relationSourceForField(fieldKey: string): RelationOptionSource | null {
  const routePath = page.value.routePath;
  if (routePath === '/platform/tenant-admins' && fieldKey === 'tenantMark') {
    return { cacheKey: 'platform.tenants', endpoint: '/platform/tenants', responseType: 'page', valueKey: 'tenantMark', labelKeys: ['tenantName', 'tenantMark'], activeOnly: true };
  }
  if (routePath === '/platform/menus' && fieldKey === 'parentMenuCode') {
    return { cacheKey: 'platform.menus', endpoint: '/platform/menus/tree', responseType: 'tree', valueKey: 'menuCode', labelKeys: ['nameZh', 'menuCode'], activeOnly: true };
  }
  if (routePath === '/basic/org-nodes' && fieldKey === 'parentOrgName') {
    return { cacheKey: 'basic.orgNodes', endpoint: '/basic/org-nodes/tree', responseType: 'tree', valueKey: 'orgName', labelKeys: ['orgName', 'orgCode'], activeOnly: true };
  }
  if (routePath === '/basic/org-nodes' && fieldKey === 'roleName') {
    return { cacheKey: 'basic.roles', endpoint: '/basic/roles', responseType: 'page', valueKey: 'roleName', labelKeys: ['roleName', 'roleCode'], activeOnly: true };
  }
  if (routePath === '/basic/org-nodes' && fieldKey === 'orgName') {
    return { cacheKey: 'basic.orgNodes', endpoint: '/basic/org-nodes/tree', responseType: 'tree', valueKey: 'orgName', labelKeys: ['orgName', 'orgCode'], activeOnly: true };
  }
  if (routePath === '/basic/users' && fieldKey === 'roleName') {
    return { cacheKey: 'basic.roles', endpoint: '/basic/roles', responseType: 'page', valueKey: 'roleName', labelKeys: ['roleName', 'roleCode'], activeOnly: true };
  }
  if (routePath === '/basic/users' && fieldKey === 'orgName') {
    return { cacheKey: 'basic.orgNodes', endpoint: '/basic/org-nodes/tree', responseType: 'tree', valueKey: 'orgName', labelKeys: ['orgName', 'orgCode'], activeOnly: true };
  }
  if (['/basic/energy-prices', '/basic/stat-models'].includes(routePath) && fieldKey === 'energyName') {
    return { cacheKey: 'basic.energyTypes', endpoint: '/basic/energy-types', responseType: 'page', valueKey: 'energyName', labelKeys: ['energyName', 'energyCode'], activeOnly: true };
  }
  if (routePath === '/basic/devices' && fieldKey === 'modelName') {
    return { cacheKey: 'basic.deviceModels', endpoint: '/basic/device-models', responseType: 'page', valueKey: 'modelName', labelKeys: ['modelName', 'modelCode'], activeOnly: true };
  }
  if (routePath === '/basic/collection-points' && fieldKey === 'collectionModelMark') {
    return { cacheKey: 'basic.collectionDeviceModels', endpoint: '/basic/device-models', responseType: 'page', valueKey: 'modelCode', labelKeys: ['modelName', 'modelCode'], activeOnly: true };
  }
  if (routePath === '/basic/collection-points' && fieldKey === 'collectionDeviceMark') {
    return { cacheKey: 'basic.collectionDevices', endpoint: '/basic/devices', responseType: 'page', valueKey: 'deviceCode', labelKeys: ['deviceName', 'deviceCode'], activeOnly: true };
  }
  return null;
}

async function hydrateRelationFields(row: Record<string, unknown> | null) {
  const sources = drawerFields.value
    .map((field) => relationSourceForField(field.key))
    .filter((source): source is RelationOptionSource => Boolean(source));
  if (!sources.length) {
    return;
  }
  const uniqueSources = Array.from(new Map(sources.map((source) => [source.cacheKey, source])).values());
  await Promise.all(uniqueSources.map(loadRelationOptions));
  drawerFields.value = drawerFields.value.map((field) => {
    const source = relationSourceForField(field.key);
    if (!source) {
      return field;
    }
    const options = withCurrentRelationOption(relationOptionCache.get(source.cacheKey) ?? [], field, row);
    if (!field.multiple && (form[field.key] === '' || form[field.key] === null || form[field.key] === undefined) && field.required && options.length) {
      form[field.key] = options[0].value;
    }
    return {
      ...field,
      type: 'select',
      options
    };
  });
}

async function loadRelationOptions(source: RelationOptionSource) {
  if (relationOptionCache.has(source.cacheKey)) {
    return;
  }
  const payload = source.responseType === 'page'
    ? await client.value.get<PageResult<Record<string, unknown>>>(source.endpoint, { page: 1, size: 200 })
    : await client.value.get<Record<string, unknown>[]>(source.endpoint);
  const rows = Array.isArray(payload) ? flattenTreeRows(payload) : payload.rows;
  const options = rows
    .filter((row) => !source.activeOnly || String(row.status ?? 'ENABLED') !== 'DISABLED')
    .map((row) => relationRowToOption(row, source))
    .filter((option): option is { labelZh: string; labelEn: string; value: string } => Boolean(option));
  relationOptionCache.set(source.cacheKey, options);
}

function flattenTreeRows(rows: Record<string, unknown>[]): Record<string, unknown>[] {
  return rows.flatMap((row) => [
    row,
    ...flattenTreeRows(Array.isArray(row.children) ? row.children as Record<string, unknown>[] : [])
  ]);
}

function relationRowToOption(row: Record<string, unknown>, source: RelationOptionSource) {
  const rawValue = row[source.valueKey];
  if (rawValue === undefined || rawValue === null || rawValue === '') {
    return null;
  }
  const labels = source.labelKeys
    .map((key) => row[key])
    .filter((value) => value !== undefined && value !== null && value !== '')
    .map(String);
  const labelText = Array.from(new Set(labels)).join(' / ') || String(rawValue);
  return { labelZh: labelText, labelEn: labelText, value: String(rawValue) };
}

function withCurrentRelationOption(
  options: Array<{ labelZh: string; labelEn: string; value: string | number | boolean }>,
  field: FormFieldConfig,
  row: Record<string, unknown> | null
) {
  const currentValue = row?.[field.key];
  if (currentValue === undefined || currentValue === null || currentValue === '') {
    return options;
  }
  const current = String(currentValue);
  if (options.some((option) => String(option.value) === current)) {
    return options;
  }
  return [{ labelZh: current, labelEn: current, value: current }, ...options];
}

async function submitDrawer() {
  if (loading.value) {
    return;
  }
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
  } else if (drawerMode.value === 'batchConfirm') {
    await submitBatchConfirm(action);
  } else if (drawerMode.value === 'move') {
    await submitAction(action, activeRow.value, { ...moveForm });
    drawerOpen.value = false;
    showFeedback(label('层级调整已提交', 'Hierarchy adjustment submitted'));
  } else if (drawerMode.value === 'copyModel' || drawerMode.value === 'copyDevice') {
    await submitAction(action, activeRow.value, { ...copyForm });
    drawerOpen.value = false;
    showFeedback(label('复制任务已提交', 'Copy task submitted'));
  } else if (drawerMode.value === 'statParam') {
    await submitAction(action, activeRow.value, { selectedParamIds: selectedStatParamKeys.value });
    drawerOpen.value = false;
    showFeedback(label('参数关联已保存', 'Parameter relations saved'));
  } else if (drawerMode.value === 'unitRelation') {
    await submitAction(action, activeRow.value, { selectedCapacityIds: selectedRelationKeys.value });
    drawerOpen.value = false;
    showFeedback(label('单耗关联已保存', 'Unit-consumption relations saved'));
  } else if (drawerMode.value === 'capacityInput' || drawerMode.value === 'indicatorInput') {
    await submitAction(action, activeRow.value, { ...inputForm });
    drawerOpen.value = false;
    showFeedback(label('录入数据已保存', 'Input data saved'));
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
  if (!importFileName.value) {
    error.value = label('请先选择导入文件', 'Please select an import file first');
    return;
  }
  await submitAction(action, activeRow.value, {
    fileName: importFileName.value,
    fileSize: importFileSize.value,
    importMode: importMode.value,
    duplicateMode: importDuplicateMode.value
  });
  drawerOpen.value = false;
  showFeedback(label('导入任务已创建', 'Import task created'));
}

async function submitPermission(action: ActionConfig) {
  const selected = Object.entries(permissionState)
    .filter(([, checked]) => checked)
    .map(([key]) => key);
  await submitAction(action, activeRow.value, {
    targetKey: activeRow.value ? rowKey(activeRow.value) : '',
    targetName: activeRow.value ? rowName(activeRow.value) : '',
    selectedPermissions: selected
  });
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

async function submitBatchConfirm(action: ActionConfig) {
  const targets = activeRow.value ? [activeRow.value] : selectedRows.value;
  await submitAction(action, activeRow.value, {
    selectedIds: targets.map((item) => rowId(item)).filter((id) => id !== null),
    selectedNames: targets.map(rowName),
    count: targets.length
  });
  drawerOpen.value = false;
  selectedRowKeys.value = [];
  showFeedback(label('操作已提交', 'Action submitted'));
  await loadData();
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

function setFieldValue(key: string, value: Event | SelectModelValue) {
  form[key] = valueFromInput(value);
}

function setImportFile(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) {
    importFileName.value = '';
    importFileSize.value = '';
    return;
  }
  if (file.size > IMPORT_FILE_MAX_BYTES) {
    input.value = '';
    importFileName.value = '';
    importFileSize.value = '';
    error.value = label('文件大小不能超过 20MB', 'File size must not exceed 20MB');
    return;
  }
  error.value = '';
  importFileName.value = file.name;
  importFileSize.value = formatFileSize(file.size);
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

async function handleExport(action: ActionConfig, row: Record<string, unknown> | null) {
  const exportScope = selectedRows.value.length ? 'selected' : 'filtered-query';
  const exportSource = selectedRows.value.length ? selectedRows.value : await loadFilteredRowsForExport();
  await submitAction(action, row, {
    filters: activeFilterParams(),
    total: total.value,
    exportedRows: exportSource.length,
    selectedIds: selectedRows.value.map((item) => rowId(item)).filter((id) => id !== null),
    scope: exportScope
  });
  exportRows(action, exportSource, exportScope);
}

async function loadFilteredRowsForExport(): Promise<Record<string, unknown>[]> {
  const params = activeFilterParams();
  if (page.value.mode === 'tree' || page.value.mode === 'treeTable') {
    const treeRows = await client.value.get<Record<string, unknown>[]>(page.value.endpoint, params);
    return flattenTreeRows(treeRows);
  }
  const pageSize = 200;
  const firstPage = await client.value.get<PageResult<Record<string, unknown>>>(page.value.endpoint, {
    ...params,
    page: 1,
    size: pageSize
  });
  const allRows = [...firstPage.rows];
  const totalPages = Math.ceil(firstPage.total / pageSize);
  for (let nextPage = 2; nextPage <= totalPages; nextPage += 1) {
    const next = await client.value.get<PageResult<Record<string, unknown>>>(page.value.endpoint, {
      ...params,
      page: nextPage,
      size: pageSize
    });
    allRows.push(...next.rows);
  }
  return allRows;
}

function exportRows(action: ActionConfig, sourceRows: Record<string, unknown>[], exportScope: 'selected' | 'filtered-query') {
  const exportColumns = columns.value.filter((column) => column.type !== 'actions');
  const header = exportColumns.map((column) => label(column.labelZh, column.labelEn));
  const csvRows = sourceRows.map((row) => exportColumns.map((column) => csvCell(displayValue(row, column.key, column.type))).join(','));
  const csv = ['\ufeff' + header.join(','), ...csvRows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${label(page.value.titleZh, page.value.titleEn)}-${action.key}.csv`;
  anchor.click();
  URL.revokeObjectURL(url);
  showFeedback(exportScope === 'selected'
    ? label(`已导出选中 ${sourceRows.length} 条`, `Exported ${sourceRows.length} selected rows`)
    : label(`已按筛选条件导出 ${sourceRows.length} 条`, `Exported ${sourceRows.length} filtered rows`));
}

function downloadImportTemplate(action: ActionConfig) {
  const fields = importTemplateFields(action);
  const title = `${label(page.value.titleZh, page.value.titleEn)}-${actionLabel(action)}`;
  const headerCells = fields.map((field) => escapeHtml(label(field.labelZh, field.labelEn)));
  const sampleCells = fields.map((field) => escapeHtml(templateSampleValue(field)));
  const guideRows = fields.map((field) => `
    <tr>
      <td>${escapeHtml(label(field.labelZh, field.labelEn))}</td>
      <td>${escapeHtml(field.key)}</td>
      <td>${field.required ? label('是', 'Yes') : label('否', 'No')}</td>
      <td>${escapeHtml(templateSampleValue(field))}</td>
      <td>${escapeHtml(templateFieldNote(field))}</td>
    </tr>
  `).join('');
  const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    body { font-family: Arial, "Microsoft YaHei", sans-serif; }
    h3 { margin: 16px 0 8px; }
    table { border-collapse: collapse; margin-bottom: 18px; }
    th, td { border: 1px solid #9ca3af; padding: 8px 10px; mso-number-format:"\\@"; }
    th { background: #d9ead3; font-weight: 700; }
  </style>
</head>
<body>
  <h3>${escapeHtml(title)}-${label('导入数据', 'Import Data')}</h3>
  <table>
    <tr>${headerCells.map((cell) => `<th>${cell}</th>`).join('')}</tr>
    <tr>${sampleCells.map((cell) => `<td>${cell}</td>`).join('')}</tr>
  </table>
  <h3>${label('字段说明', 'Field Guide')}</h3>
  <table>
    <tr>
      <th>${label('字段', 'Field')}</th>
      <th>${label('字段标识', 'Field Key')}</th>
      <th>${label('必填', 'Required')}</th>
      <th>${label('示例', 'Example')}</th>
      <th>${label('说明', 'Description')}</th>
    </tr>
    ${guideRows}
  </table>
</body>
</html>`;
  downloadBlob(`${title}-${label('导入模板', 'Import Template')}.xls`, html, 'application/vnd.ms-excel;charset=utf-8');
  showFeedback(label('导入模板已下载', 'Import template downloaded'));
}

function importTemplateFields(action: ActionConfig): FormFieldConfig[] {
  const customFields = customImportTemplateFields(action.key);
  if (customFields.length) {
    return customFields;
  }
  const configuredFields = page.value.create?.fields ?? page.value.edit?.fields;
  if (configuredFields?.length) {
    return configuredFields;
  }
  return inferFormFields(action);
}

function customImportTemplateFields(actionKey: string): FormFieldConfig[] {
  if (actionKey === 'importStatTree') {
    return [
      { key: 'energyName', labelZh: '能源类型', labelEn: 'Energy Type', required: true },
      { key: 'statModelCode', labelZh: '统计模型编码', labelEn: 'Stat Model Code', required: true },
      { key: 'statModelName', labelZh: '统计模型名称', labelEn: 'Stat Model Name', required: true },
      { key: 'parentNodeName', labelZh: '上级节点', labelEn: 'Parent Node' },
      { key: 'nodeCode', labelZh: '节点编码', labelEn: 'Node Code', required: true },
      { key: 'nodeName', labelZh: '节点名称', labelEn: 'Node Name', required: true },
      { key: 'sortOrder', labelZh: '排序', labelEn: 'Sort', type: 'number' },
      { key: 'status', labelZh: '状态', labelEn: 'Status', options: getEnumOptionsForField('status') }
    ];
  }
  if (actionKey === 'importStatParamRelations') {
    return [
      { key: 'statModelName', labelZh: '统计模型', labelEn: 'Stat Model', required: true },
      { key: 'statNodeName', labelZh: '统计节点', labelEn: 'Stat Node', required: true },
      { key: 'collectionModelMark', labelZh: '采集模型标识', labelEn: 'Collection Model Mark', required: true },
      { key: 'collectionDeviceMark', labelZh: '采集设备标识', labelEn: 'Collection Device Mark', required: true },
      { key: 'collectionParamMark', labelZh: '采集参数标识', labelEn: 'Collection Param Mark', required: true },
      { key: 'relationType', labelZh: '关联类型', labelEn: 'Relation Type' }
    ];
  }
  if (actionKey === 'importUnitConsumption') {
    return [
      { key: 'centerCode', labelZh: '产能中心编码', labelEn: 'Center Code', required: true },
      { key: 'centerName', labelZh: '产能中心名称', labelEn: 'Center Name', required: true },
      { key: 'statNodeName', labelZh: '关联数据', labelEn: 'Related Data', required: true },
      { key: 'outputUnit', labelZh: '产量单位', labelEn: 'Output Unit' },
      { key: 'valueUnit', labelZh: '产值单位', labelEn: 'Value Unit' },
      { key: 'peopleUnit', labelZh: '人数单位', labelEn: 'People Unit' },
      { key: 'areaUnit', labelZh: '面积单位', labelEn: 'Area Unit' }
    ];
  }
  return [];
}

function templateSampleValue(field: FormFieldConfig): string {
  if (field.options?.length) {
    const option = field.options.find((item) => item.value !== '') ?? field.options[0];
    return String(option.value);
  }
  if (field.type === 'number') {
    return '1';
  }
  if (field.type === 'time') {
    return '08:00';
  }
  if (field.type === 'boolean') {
    return label('否', 'No');
  }
  if (field.key.toLowerCase().includes('email')) {
    return 'demo@example.com';
  }
  if (field.key.toLowerCase().includes('phone')) {
    return '13800000000';
  }
  return `${label(field.labelZh, field.labelEn)}001`;
}

function templateFieldNote(field: FormFieldConfig): string {
  if (field.options?.length) {
    return label('请填写下拉选项值', 'Use one of the select option values');
  }
  if (field.type === 'boolean') {
    return label('填写 是/否 或 true/false', 'Use yes/no or true/false');
  }
  if (field.type === 'time') {
    return 'HH:mm';
  }
  return field.required ? label('必填字段', 'Required field') : label('可选字段', 'Optional field');
}

function downloadBlob(fileName: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
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
  error.value = friendlyError(err);
}

function friendlyError(err: unknown): string {
  if (err instanceof ApiError && err.code === 'NETWORK_ERROR') {
    return label('网络请求失败，请稍后重试', 'Network request failed, please try again');
  }
  return err instanceof Error ? err.message : String(err);
}

watch(() => props.context.routePath, () => {
  pageNo.value = 1;
  drawerOpen.value = false;
  collapsedTreeRows.value = [];
  selectedRowKeys.value = [];
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
      </div>
      <div class="workspace-actions">
        <button class="ep-button icon" :title="label('刷新', 'Refresh')" :disabled="loading" @click="loadData">
          <RefreshCw :size="16" />
        </button>
        <button
          v-for="action in topActions"
          :key="action.key"
          type="button"
          :class="['ep-button', { primary: action.primary, danger: action.danger }]"
          :disabled="loading"
          @click="handleTopAction(action)"
        >
          <component :is="actionIcon(action)" :size="16" />
          {{ actionLabel(action) }}
        </button>
      </div>
    </header>

    <section v-if="filterConfigs.length && !isOrgManagementPage" class="workspace-filters">
      <label v-for="filter in filterConfigs" :key="filter.key" class="filter-field">
        <span>{{ label(filter.labelZh, filter.labelEn) }}</span>
        <EpSelect
          v-if="filter.type === 'select'"
          :model-value="filters[filter.key] ?? ''"
          :options="optionLabel(filter.options)"
          @update:model-value="setFilterValue(filter.key, $event)"
        />
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
        <button class="ep-button primary" :disabled="loading" @click="searchTable">
          <Search :size="16" />
          {{ label('查询', 'Search') }}
        </button>
        <button class="ep-button" :disabled="loading" @click="resetFilters">{{ label('重置', 'Reset') }}</button>
      </div>
    </section>

    <div v-if="error" class="workspace-alert">{{ error }}</div>
    <div v-if="feedback" class="workspace-toast">{{ feedback }}</div>

    <div v-if="isOrgManagementPage" class="org-management-layout">
      <aside class="org-tree-panel">
        <div class="org-tree-title">
          <span>{{ label('组织树', 'Organization Tree') }}</span>
          <button type="button" class="ep-button small" @click="topActions[0] && handleTopAction(topActions[0])">
            {{ label('新增', 'Add') }}
          </button>
        </div>
        <div class="org-tree-list">
          <button
            v-for="node in orgTreeRows"
            :key="treeRowKey(node)"
            type="button"
            :class="['org-tree-node', { active: isOrgSelected(node) }]"
            :style="{ paddingLeft: `${Number(node._level ?? 0) * 18 + 8}px` }"
            @click="selectOrgNode(node)"
          >
            <span class="org-tree-drag">≡</span>
            <span class="org-tree-caret">{{ hasChildren(node) ? '▸' : '' }}</span>
            <span>{{ displayValue(node, 'orgName') }}</span>
          </button>
        </div>
      </aside>
      <section class="org-main-panel">
        <section v-if="filterConfigs.length" class="workspace-filters org-workspace-filters">
          <label v-for="filter in filterConfigs" :key="filter.key" class="filter-field">
            <span>{{ label(filter.labelZh, filter.labelEn) }}</span>
            <EpSelect
              v-if="filter.type === 'select'"
              :model-value="filters[filter.key] ?? ''"
              :options="optionLabel(filter.options)"
              @update:model-value="setFilterValue(filter.key, $event)"
            />
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
            <button class="ep-button primary" :disabled="loading" @click="searchTable">
              <Search :size="16" />
              {{ label('查询', 'Search') }}
            </button>
            <button class="ep-button" :disabled="loading" @click="resetFilters">{{ label('重置', 'Reset') }}</button>
          </div>
        </section>
        <div class="workspace-table-wrap org-member-table-wrap">
          <table v-if="rows.length" class="ep-table">
            <colgroup>
              <col style="width: 46px" />
              <col v-for="column in orgMemberColumns" :key="column.key" :style="orgMemberTableColumns.columnStyle(column)" />
            </colgroup>
            <thead>
              <tr>
                <th class="selection-column" scope="col">
                  <input
                    type="checkbox"
                    :checked="allPageRowsSelected"
                    :indeterminate.prop="partiallySelected"
                    @change="toggleAllPageRows(($event.target as HTMLInputElement).checked)"
                  />
                </th>
                <th v-for="column in orgMemberColumns" :key="column.key" :style="orgMemberTableColumns.columnStyle(column)" scope="col">
                  <span class="ep-table-head-content">
                    <span class="ep-table-head-label">{{ label(column.labelZh, column.labelEn) }}</span>
                  </span>
                  <button
                    type="button"
                    class="ep-column-resizer"
                    :aria-label="`${label(column.labelZh, column.labelEn)} ${label('列宽调整', 'column resize')}`"
                    :title="label('拖拽调整列宽，双击恢复自适应', 'Drag to resize, double click to auto fit')"
                    @pointerdown="orgMemberTableColumns.startColumnResize($event, column)"
                    @dblclick.stop.prevent="orgMemberTableColumns.resetColumnWidth(column)"
                  ></button>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, rowIndex) in rows" :key="String(row.id ?? rowIndex)">
                <td class="selection-column">
                  <input
                    type="checkbox"
                    :checked="selectedRowKeys.includes(rowKey(row))"
                    @change="toggleRowSelection(row, ($event.target as HTMLInputElement).checked)"
                  />
                </td>
                <td
                  v-for="column in orgMemberColumns"
                  :key="column.key"
                  :class="{ 'actions-cell': column.type === 'actions' }"
                  :style="orgMemberTableColumns.columnStyle(column)"
                >
                  <span v-if="column.type === 'status'" :class="['ep-status', { disabled: statusDisabled(row, column.key) }]">
                    {{ displayValue(row, column.key, column.type) }}
                  </span>
                  <span v-else-if="column.type === 'actions'" class="row-actions">
                    <button
                      v-for="action in orgMemberActions"
                      :key="action.key"
                      type="button"
                      :class="['row-action', { danger: rowAction(action, row).danger }]"
                      :disabled="loading"
                      @click="handleOrgMemberAction(action, row)"
                    >
                      {{ rowActionLabel(action, row) }}
                    </button>
                  </span>
                  <span v-else>{{ displayValue(row, column.key, column.type) }}</span>
                </td>
              </tr>
            </tbody>
          </table>
          <div v-else class="ep-empty">{{ loading ? label('加载中', 'Loading') : label('暂无数据', 'No data') }}</div>
        </div>
      </section>
    </div>

    <div v-else-if="isDomainLayoutPage" class="domain-layout">
      <aside class="domain-tree-panel">
        <div class="domain-tree-title">
          {{ domainTreeTitle(page.routePath) }}
        </div>
        <div class="domain-tree-list">
          <button
            v-for="item in domainTreeRows"
            :key="item.id"
            type="button"
            :class="['domain-tree-item', `level-${item._level}`, { active: isDomainTreeActive(item) }]"
            :style="domainTreeNodeStyle(item)"
            @click="selectDomainTreeNode(item)"
          >
            <span class="domain-tree-drag">≡</span>
            <span
              :class="['domain-tree-caret', { empty: !item._hasChildren }]"
              @click.stop="toggleDomainTreeNode(item)"
            >
              {{ item._hasChildren ? (collapsedDomainTreeRows.includes(domainTreeNodeKey(item)) ? '▸' : '▾') : '' }}
            </span>
            <span class="domain-tree-name">{{ item.label }}</span>
          </button>
        </div>
      </aside>
      <section class="domain-main-panel">
        <div class="domain-context-bar">
          <label v-for="field in domainContextFields" :key="field.key" class="filter-field">
            <span>{{ field.label }}</span>
            <EpSelect
              :model-value="domainContextValue(field)"
              :options="field.options"
              @update:model-value="setDomainContextValue(field.key, $event)"
            />
          </label>
          <button v-if="page.routePath.includes('capacity-centers')" type="button" class="ep-button">
            <Download :size="16" />
            {{ label('下载录入说明', 'Download Guide') }}
          </button>
        </div>
        <div class="workspace-table-wrap">
          <table v-if="rows.length" :class="['ep-table', { 'menu-tree-table': page.mode === 'treeTable' }]">
            <colgroup>
              <col v-if="hasSelectionColumn" style="width: 46px" />
              <col v-for="column in columns" :key="column.key" :style="mainTableColumns.columnStyle(column)" />
            </colgroup>
            <thead>
              <tr>
                <th v-if="hasSelectionColumn" class="selection-column" scope="col">
                  <input
                    type="checkbox"
                    :checked="allPageRowsSelected"
                    :indeterminate.prop="partiallySelected"
                    @change="toggleAllPageRows(($event.target as HTMLInputElement).checked)"
                  />
                </th>
                <th v-for="column in columns" :key="column.key" :style="mainTableColumns.columnStyle(column)" scope="col">
                  <span class="ep-table-head-content">
                    <span class="ep-table-head-label">{{ label(column.labelZh, column.labelEn) }}</span>
                  </span>
                  <button
                    type="button"
                    class="ep-column-resizer"
                    :aria-label="`${label(column.labelZh, column.labelEn)} ${label('列宽调整', 'column resize')}`"
                    :title="label('拖拽调整列宽，双击恢复自适应', 'Drag to resize, double click to auto fit')"
                    @pointerdown="mainTableColumns.startColumnResize($event, column)"
                    @dblclick.stop.prevent="mainTableColumns.resetColumnWidth(column)"
                  ></button>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(row, rowIndex) in rows" :key="String(row.id ?? rowIndex)">
                <td v-if="hasSelectionColumn" class="selection-column">
                  <input
                    type="checkbox"
                    :checked="selectedRowKeys.includes(rowKey(row))"
                    @change="toggleRowSelection(row, ($event.target as HTMLInputElement).checked)"
                  />
                </td>
                <td
                  v-for="(column, colIndex) in columns"
                  :key="column.key"
                  :class="{ 'actions-cell': column.type === 'actions' }"
                  :style="mainTableColumns.columnStyle(column)"
                >
                  <span v-if="column.type === 'status'" :class="['ep-status', { disabled: statusDisabled(row, column.key) }]">
                    {{ displayValue(row, column.key, column.type) }}
                  </span>
                  <span v-else-if="column.type === 'actions'" class="row-actions">
                    <button
                      v-for="action in rowActions"
                      :key="action.key"
                      type="button"
                      :class="['row-action', { danger: rowAction(action, row).danger }]"
                      :disabled="loading"
                      @click="handleRowAction(action, row)"
                    >
                      {{ rowActionLabel(action, row) }}
                    </button>
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
      </section>
    </div>

    <div v-else class="workspace-table-wrap">
      <table v-if="rows.length" :class="['ep-table', { 'menu-tree-table': page.mode === 'treeTable' }]">
        <colgroup>
          <col v-if="hasSelectionColumn" style="width: 46px" />
          <col v-for="column in columns" :key="column.key" :style="mainTableColumns.columnStyle(column)" />
        </colgroup>
        <thead>
          <tr>
            <th v-if="hasSelectionColumn" class="selection-column" scope="col">
              <input
                type="checkbox"
                :checked="allPageRowsSelected"
                :indeterminate.prop="partiallySelected"
                @change="toggleAllPageRows(($event.target as HTMLInputElement).checked)"
              />
            </th>
            <th v-for="column in columns" :key="column.key" :style="mainTableColumns.columnStyle(column)" scope="col">
              <span class="ep-table-head-content">
                <span class="ep-table-head-label">{{ label(column.labelZh, column.labelEn) }}</span>
              </span>
              <button
                type="button"
                class="ep-column-resizer"
                :aria-label="`${label(column.labelZh, column.labelEn)} ${label('列宽调整', 'column resize')}`"
                :title="label('拖拽调整列宽，双击恢复自适应', 'Drag to resize, double click to auto fit')"
                @pointerdown="mainTableColumns.startColumnResize($event, column)"
                @dblclick.stop.prevent="mainTableColumns.resetColumnWidth(column)"
              ></button>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(row, rowIndex) in rows" :key="String(row.id ?? rowIndex)">
            <td v-if="hasSelectionColumn" class="selection-column">
              <input
                type="checkbox"
                :checked="selectedRowKeys.includes(rowKey(row))"
                @change="toggleRowSelection(row, ($event.target as HTMLInputElement).checked)"
              />
            </td>
            <td
              v-for="(column, colIndex) in columns"
              :key="column.key"
              :class="{ 'actions-cell': column.type === 'actions' }"
              :style="mainTableColumns.columnStyle(column)"
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
                  :class="['row-action', { danger: rowAction(action, row).danger }]"
                  :disabled="loading"
                  @click="handleRowAction(action, row)"
                >
                  {{ rowActionLabel(action, row) }}
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
      <span v-if="selectedRows.length" class="workspace-selection-hint">
        {{ label('已选', 'Selected') }} {{ selectedRows.length }} {{ label('条', 'items') }}
      </span>
      <button class="page-no" :disabled="loading || pageNo <= 1" @click="goPage(pageNo - 1)">‹</button>
      <button
        v-for="item in pageCount"
        :key="item"
        :class="['page-no', { active: item === pageNo }]"
        :disabled="loading"
        @click="goPage(item)"
      >
        {{ item }}
      </button>
      <button class="page-no" :disabled="loading || pageNo >= pageCount" @click="goPage(pageNo + 1)">›</button>
      <div class="page-size-select">
        <EpSelect
          :model-value="size"
          :options="pageSizeSelectOptions()"
          :disabled="loading"
          @update:model-value="changePageSize"
        />
      </div>
    </footer>

    <div v-if="drawerOpen" :class="['workspace-drawer', { 'modal-drawer': orgDialogMode }]">
      <form
        class="drawer-panel"
        :class="{ wide: drawerWide, 'org-dialog-panel': orgDialogMode }"
        @submit.prevent="submitDrawer"
      >
        <header>
          <h3>{{ drawerTitle }}</h3>
          <button type="button" class="ep-button icon" @click="drawerOpen = false">
            <X :size="16" />
          </button>
        </header>

        <div v-if="drawerMode === 'form'" class="drawer-grid">
          <label
            v-for="field in drawerFields"
            :key="field.key"
            class="drawer-field"
            :class="{ 'boolean-field': field.type === 'boolean' }"
          >
            <span>{{ label(field.labelZh, field.labelEn) }}</span>
            <textarea
              v-if="field.type === 'textarea'"
              :value="String(form[field.key] ?? '')"
              class="ep-textarea"
              rows="4"
              :required="field.required"
              @input="setFieldValue(field.key, $event)"
            />
            <EpSelect
              v-else-if="field.type === 'select'"
              :model-value="form[field.key] ?? (field.multiple ? [] : '')"
              :options="optionLabel(field.options)"
              :multiple="field.multiple"
              :placeholder="label('请选择或搜索', 'Select or search')"
              @update:model-value="setFieldValue(field.key, $event)"
            />
            <div
              v-else-if="field.type === 'boolean'"
              class="ep-checkbox-control"
            >
              <input
                type="checkbox"
                :checked="Boolean(form[field.key])"
                @change="setBooleanField(field.key, $event)"
              />
              <span>{{ label('是', 'Yes') }}</span>
            </div>
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
            <div class="upload-box">
              <input
                type="file"
                accept=".xlsx,.xls"
                :aria-label="label('选择导入文件', 'Choose import file')"
                @change="setImportFile"
              />
              <div class="upload-content">
                <Upload class="upload-icon" :size="36" />
                <div v-if="importFileName" class="upload-file-name" :title="importFileName">
                  {{ importFileName }}
                  <small v-if="importFileSize">{{ importFileSize }}</small>
                </div>
                <div v-else>
                  {{ label('将文件拖到此处，或', 'Drag file here, or ') }}
                  <span class="upload-link">{{ label('点击上传', 'click to upload') }}</span>
                </div>
                <div class="upload-tip">{{ label('支持扩展名：.xlsx .xls，单个文件不超过 20MB', 'Supported: .xlsx .xls, max 20MB') }}</div>
              </div>
            </div>
          </label>
          <label class="drawer-field">
            <span>{{ label('导入模式', 'Import Mode') }}</span>
            <EpSelect
              :model-value="importMode"
              :options="importModeOptions()"
              @update:model-value="importMode = String($event)"
            />
          </label>
          <label v-if="isOrgManagementPage" class="drawer-field">
            <span>{{ label('重复数据', 'Duplicate Data') }}</span>
            <EpSelect
              :model-value="importDuplicateMode"
              :options="[
                { label: label('覆盖', 'Overwrite'), value: 'OVERWRITE' },
                { label: label('跳过', 'Skip'), value: 'SKIP' }
              ]"
              @update:model-value="importDuplicateMode = String($event)"
            />
          </label>
          <div class="import-template-card">
            <div>
              <strong>{{ label('导入模板', 'Import Template') }}</strong>
              <span>{{ label('请先下载模板并按字段说明填写数据', 'Download the template and fill data by the field guide') }}</span>
            </div>
            <button type="button" class="ep-button" @click="activeAction && downloadImportTemplate(activeAction)">
              <Download :size="16" />
              {{ label('下载模板', 'Download Template') }}
            </button>
          </div>
        </div>

        <div v-else-if="drawerMode === 'batchConfirm'" class="batch-panel">
          <p>
            {{ label('本操作将作用于以下记录：', 'This operation will apply to:') }}
          </p>
          <div class="selected-record-list">
            <div
              v-for="target in activeRow ? [activeRow] : selectedRows"
              :key="rowKey(target)"
              class="selected-record-item"
            >
              <span>{{ rowName(target) }}</span>
              <small>{{ rowKey(target) }}</small>
            </div>
          </div>
        </div>

        <div v-else-if="drawerMode === 'move'" :class="['move-panel', { 'org-move-panel': isOrgManagementPage }]">
          <template v-if="isOrgManagementPage">
            <label class="drawer-field org-move-search">
              <span>{{ label('名称', 'Name') }}</span>
              <div class="org-move-search-row">
                <input v-model="orgMoveSearch" class="ep-input" :placeholder="label('请输入节点名称', 'Enter node name')" />
                <button type="button" class="ep-button primary">{{ label('搜索', 'Search') }}</button>
              </div>
            </label>
            <div class="org-move-tree">
              <label
                v-for="node in orgMoveRows"
                :key="treeRowKey(node)"
                class="check-row tree-row"
                :style="{ paddingLeft: `${Number(node._level ?? 0) * 28 + 8}px` }"
              >
                <span class="org-tree-drag">≡</span>
                <span class="permission-caret">{{ hasChildren(node) ? '−' : '' }}</span>
                <input
                  type="checkbox"
                  :checked="moveForm.nodeKey === rowKey(node)"
                  @change="moveForm.nodeKey = rowKey(node)"
                />
                <span>{{ displayValue(node, 'orgName') }}</span>
              </label>
            </div>
          </template>
          <template v-else>
          <div class="move-grid">
            <label class="drawer-field">
              <span>{{ label('当前节点', 'Current Node') }}</span>
              <EpSelect
                :model-value="moveForm.nodeKey"
                :options="rows.map((item) => ({ label: rowName(item), value: rowKey(item) }))"
                @update:model-value="moveForm.nodeKey = String($event)"
              />
            </label>
            <label class="drawer-field">
              <span>{{ label('新的上级节点', 'New Parent Node') }}</span>
              <EpSelect
                :model-value="moveForm.targetParentKey"
                :options="rows.filter((item) => rowKey(item) !== moveForm.nodeKey).map((item) => ({ label: rowName(item), value: rowKey(item) }))"
                @update:model-value="moveForm.targetParentKey = String($event)"
              />
            </label>
            <label class="drawer-field">
              <span>{{ label('排序号', 'Sort Order') }}</span>
              <input v-model.number="moveForm.sortOrder" class="ep-input" type="number" />
            </label>
          </div>
          <div class="selected-record-list">
            <div v-for="item in rows.slice(0, 6)" :key="rowKey(item)" class="drag-preview-item">
              <span>{{ rowName(item) }}</span>
              <small>{{ item.orgCode ?? item.menuCode ?? item.id }}</small>
            </div>
          </div>
          </template>
        </div>

        <div v-else-if="drawerMode === 'copyModel' || drawerMode === 'copyDevice'" class="copy-panel">
          <div class="copy-grid">
            <label class="drawer-field">
              <span>{{ label('复制来源', 'Source') }}</span>
              <EpSelect
                :model-value="copyForm.sourceKey"
                :options="rows.map((item) => ({ label: rowName(item), value: rowKey(item) }))"
                @update:model-value="copyForm.sourceKey = String($event)"
              />
            </label>
            <label class="drawer-field">
              <span>{{ label('新编码', 'New Code') }}</span>
              <input v-model="copyForm.newCode" class="ep-input" />
            </label>
            <label class="drawer-field">
              <span>{{ label('新名称', 'New Name') }}</span>
              <input v-model="copyForm.newName" class="ep-input" />
            </label>
            <label class="check-row">
              <input v-model="copyForm.copyParams" type="checkbox" />
              <span>{{ label('复制参数定义', 'Copy parameter definitions') }}</span>
            </label>
            <label class="check-row">
              <input v-model="copyForm.copyPoints" type="checkbox" />
              <span>{{ label('复制点位绑定', 'Copy point bindings') }}</span>
            </label>
          </div>
        </div>

        <div v-else-if="drawerMode === 'statParam'" class="stat-param-panel">
          <div class="stat-param-toolbar">
            <strong>{{ label('参数关联', 'Parameter Relations') }}</strong>
            <span>{{ label('已关联参数置顶显示，可手动勾选调整', 'Bound params are sorted first and can be adjusted') }}</span>
          </div>
          <table class="ep-table params-table">
            <thead>
              <tr>
                <th class="selection-column"></th>
                <th>{{ label('参数名称', 'Param Name') }}</th>
                <th>{{ label('参数标识', 'Param Code') }}</th>
                <th>{{ label('采集模型', 'Collection Model') }}</th>
                <th>{{ label('设备', 'Device') }}</th>
                <th>{{ label('点位', 'Point') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in statParamRows" :key="String(item.id)">
                <td class="selection-column">
                  <input v-model="selectedStatParamKeys" type="checkbox" :value="String(item.id)" />
                </td>
                <td>{{ item.paramName }}</td>
                <td>{{ item.paramCode }}</td>
                <td>{{ item.collectionModel }}</td>
                <td>{{ item.deviceName }}</td>
                <td>{{ item.pointName }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-else-if="drawerMode === 'unitRelation'" class="stat-param-panel">
          <div class="domain-layout">
            <aside class="domain-tree-panel">
              <div class="domain-tree-title">{{ label('统计模型节点', 'Stat Nodes') }}</div>
              <div class="domain-tree-list">
                <button
                  v-for="item in domainTreeRows"
                  :key="item.id"
                  type="button"
                  :class="['domain-tree-item', `level-${item._level}`, { active: isDomainTreeActive(item) }]"
                  :style="domainTreeNodeStyle(item)"
                  @click="selectDomainTreeNode(item)"
                >
                  <span class="domain-tree-drag">≡</span>
                  <span
                    :class="['domain-tree-caret', { empty: !item._hasChildren }]"
                    @click.stop="toggleDomainTreeNode(item)"
                  >
                    {{ item._hasChildren ? (collapsedDomainTreeRows.includes(domainTreeNodeKey(item)) ? '▸' : '▾') : '' }}
                  </span>
                  <span class="domain-tree-name">{{ item.label }}</span>
                </button>
              </div>
            </aside>
            <section class="domain-tree-panel">
              <div class="domain-tree-title">{{ label('选择产能中心数据', 'Select Capacity Center Data') }}</div>
              <label v-for="item in relationItems" :key="item.id" class="check-row">
                <input v-model="selectedRelationKeys" type="checkbox" :value="item.id" />
                <span>{{ item.label }}</span>
              </label>
            </section>
          </div>
        </div>

        <div v-else-if="drawerMode === 'capacityInput' || drawerMode === 'indicatorInput'" class="batch-panel">
          <div class="input-grid">
            <label class="drawer-field">
              <span>{{ drawerMode === 'capacityInput' ? label('产能中心', 'Capacity Center') : label('指标名称', 'Indicator') }}</span>
              <input v-model="inputForm.target" class="ep-input" />
            </label>
            <label class="drawer-field">
              <span>{{ label('维护维度', 'Period') }}</span>
              <EpSelect
                :model-value="inputForm.periodType"
                :options="[{ label: label('月', 'Month'), value: 'MONTH' }, { label: label('日', 'Day'), value: 'DAY' }, { label: label('小时', 'Hour'), value: 'HOUR' }]"
                @update:model-value="inputForm.periodType = String($event)"
              />
            </label>
            <label class="drawer-field">
              <span>{{ label('时间', 'Time') }}</span>
              <input v-model="inputForm.dataTime" class="ep-input" />
            </label>
            <label class="drawer-field">
              <span>{{ label('数值', 'Value') }}</span>
              <input v-model="inputForm.value" class="ep-input" type="number" />
            </label>
            <label class="drawer-field">
              <span>{{ label('单位', 'Unit') }}</span>
              <input v-model="inputForm.unit" class="ep-input" />
            </label>
          </div>
        </div>

        <div v-else-if="drawerMode === 'permission'" class="permission-assignment">
          <div class="permission-target-grid">
            <label v-for="field in permissionTargetFields" :key="field.label" class="drawer-field">
              <span>{{ field.label }}</span>
              <input class="ep-input" :value="field.value" readonly />
            </label>
          </div>
          <div :class="['permission-grid', { 'role-permission': activeAction?.key === 'configurePermissions' }]">
            <section v-for="panel in permissionPanels" :key="panel.title" class="permission-box tree">
              <header>
                <span>{{ panel.title }}</span>
                <button
                  type="button"
                  class="row-action"
                  @click="setPermissionPanelChecked(panel, true)"
                >
                  {{ label('全选', 'All') }}
                </button>
              </header>
              <div class="permission-tree">
                <div v-for="item in panel.items" :key="item.id" class="permission-tree-group">
                  <label class="check-row tree-row level-0">
                    <span v-if="item.children?.length" class="permission-caret">▾</span>
                    <span v-else class="permission-caret empty"></span>
                    <input :checked="permissionState[item.id]" type="checkbox" @change="setPermissionNodeChecked(item, checkedFromEvent($event))" />
                    <span>{{ item.label }}</span>
                  </label>
                  <template v-for="child in item.children ?? []" :key="child.id">
                    <label class="check-row tree-row level-1">
                      <span v-if="child.children?.length" class="permission-caret">▾</span>
                      <span v-else class="permission-caret empty"></span>
                      <input :checked="permissionState[child.id]" type="checkbox" @change="setPermissionNodeChecked(child, checkedFromEvent($event))" />
                      <span>{{ child.label }}</span>
                    </label>
                    <label v-for="grandchild in child.children ?? []" :key="grandchild.id" class="check-row tree-row level-2">
                      <span class="permission-caret empty"></span>
                      <input v-model="permissionState[grandchild.id]" type="checkbox" />
                      <span>{{ grandchild.label }}</span>
                    </label>
                  </template>
                </div>
              </div>
            </section>
          </div>
        </div>

        <div v-else-if="drawerMode === 'members'" class="permission-grid compact">
          <label v-for="item in memberCandidates" :key="item.id" class="check-row member-row">
            <input v-model="memberState[item.id]" type="checkbox" />
            <span>{{ item.label }}</span>
          </label>
        </div>

        <div v-else-if="drawerMode === 'params'" class="params-panel">
          <div class="params-toolbar">
            <button
              type="button"
              class="ep-button primary"
              :disabled="loading"
              @click="submitAction(activeAction!, activeRow, { addParam: true })"
            >
              <Plus :size="16" />
              {{ label('新增参数', 'Add Param') }}
            </button>
          </div>
          <table v-if="paramRows.length" class="ep-table params-table">
            <colgroup>
              <col v-for="column in paramColumns" :key="column.key" :style="paramTableColumns.columnStyle(column)" />
            </colgroup>
            <thead>
              <tr>
                <th
                  v-for="column in paramColumns"
                  :key="column.key"
                  :style="paramTableColumns.columnStyle(column)"
                  scope="col"
                >
                  <span class="ep-table-head-content">
                    <span class="ep-table-head-label">{{ label(column.labelZh, column.labelEn) }}</span>
                  </span>
                  <button
                    type="button"
                    class="ep-column-resizer"
                    :aria-label="`${label(column.labelZh, column.labelEn)} ${label('列宽调整', 'column resize')}`"
                    :title="label('拖拽调整列宽，双击恢复自适应', 'Drag to resize, double click to auto fit')"
                    @pointerdown="paramTableColumns.startColumnResize($event, column)"
                    @dblclick.stop.prevent="paramTableColumns.resetColumnWidth(column)"
                  ></button>
                </th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="param in paramRows" :key="String(param.id)">
                <td v-for="column in paramColumns" :key="column.key" :style="paramTableColumns.columnStyle(column)">
                  {{ displayValue(param, column.key, column.type) }}
                </td>
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
