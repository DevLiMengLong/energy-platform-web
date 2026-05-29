<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import {
  ChevronLeft,
  ChevronRight,
  Eraser,
  FileDown,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  Settings2,
  X
} from 'lucide-vue-next';
import type { CurrentUser, MicroAppContext } from '@energy-platform/shared';

interface ConfigRow {
  tenantMark: string;
  pointName: string;
  unit: string;
  modelMark: string;
  deviceMark: string;
  paramMark: string;
  modelName?: string;
  deviceName?: string;
  paramName?: string;
  transformFormula: string;
  minValue?: string | null;
  maxValue?: string | null;
  maxDelta?: string | null;
  cumulative: boolean;
  rolloverEnabled: boolean;
  rolloverMaxValue?: string | null;
  rolloverMinPreviousValue?: string | null;
  rolloverMaxCurrentValue?: string | null;
  enabled: boolean;
  configStatus: 'enabled' | 'disabled' | 'unconfigured';
}

interface BasicPoint {
  id?: number;
  collectionModelMark: string;
  collectionModelName?: string;
  collectionDeviceMark: string;
  collectionDeviceName?: string;
  collectionParamMark: string;
  collectionParamName?: string;
  businessName?: string;
  unit?: string;
}

interface DetailSummaryRow {
  key: string;
  pointName: string;
  unit: string;
  modelMark: string;
  deviceMark: string;
  paramMark: string;
  totalCount: number;
  normalCount: number;
  abnormalCount: number;
  latestTime: string;
  result: '正常' | '异常';
}

interface CleanRecord {
  normal_second?: number;
  receive_time?: string;
  raw_value?: string;
  clean_value?: string | number;
  quality_code?: number;
  clean_rule?: string;
  effective_flag?: number;
  raw_id?: string;
  id?: string;
}

interface PagePayload<T> {
  total: number;
  records?: T[];
  rows?: T[];
}

const props = defineProps<{
  context: MicroAppContext;
}>();

const tenantMark = ref('tenant_a');
const loading = ref(false);
const toast = reactive({ show: false, type: 'info' as 'info' | 'warn' | 'error', message: '' });
let toastTimer: number | undefined;

const currentView = computed(() => (props.context.routePath.includes('/details') ? 'details' : 'config'));

const configFilters = reactive({
  modelMark: '',
  deviceMark: '',
  paramMark: '',
  pointName: '',
  configStatus: '',
  cumulative: ''
});
const configPager = reactive({ pageNo: 1, pageSize: 10, total: 0 });
const configRows = ref<ConfigRow[]>([]);
const selectedConfigKeys = ref<Set<string>>(new Set());

const configModal = reactive({
  open: false,
  title: '单点配置',
  targets: [] as ConfigRow[],
  form: {
    transformFormula: 'x',
    minValue: '',
    maxValue: '',
    maxDelta: '',
    cumulative: false,
    rolloverEnabled: false,
    rolloverMaxValue: '',
    rolloverMinPreviousValue: '',
    rolloverMaxCurrentValue: ''
  }
});

const formulaKeys = ['x', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '.', '+', '-', '*', '/', '(', ')'];

const detailsFilters = reactive({
  modelMark: '',
  deviceMark: '',
  paramMark: '',
  pointName: '',
  result: '',
  startTime: '',
  endTime: ''
});
const detailsPager = reactive({ pageNo: 1, pageSize: 10, total: 0 });
const detailPointRows = ref<BasicPoint[]>([]);
const detailSummaries = ref<DetailSummaryRow[]>([]);
const selectedDetailKeys = ref<Set<string>>(new Set());
const detailRuleOpen = ref(false);
const detailRuleCodes = ref<number[]>([]);

const detailModal = reactive({
  open: false,
  point: null as DetailSummaryRow | null,
  startTime: '',
  endTime: '',
  ruleCodes: [] as number[],
  ruleOpen: false,
  pageNo: 1,
  pageSize: 5,
  total: 0,
  records: [] as CleanRecord[]
});

const ruleOptions = [
  { label: '格式错误', code: 1 },
  { label: '时间异常', code: 2 },
  { label: '重复数据', code: 4 },
  { label: '越限', code: 6 },
  { label: '突变', code: 7 },
  { label: '累计倒退', code: 8 },
  { label: '公式错误', code: 9 },
  { label: '合法回零', code: 10 }
];

onMounted(async () => {
  setDefaultTimeRange();
  await loadTenant();
  await refreshCurrentView();
});

watch(
  () => props.context.routePath,
  async () => {
    await refreshCurrentView();
  }
);

async function refreshCurrentView() {
  if (currentView.value === 'details') {
    await loadDetailPoints();
    await queryDetailSummary();
  } else {
    await loadConfigRows();
  }
}

async function loadTenant() {
  try {
    const me = await request<CurrentUser>('/api/basic/me', { method: 'GET' });
    tenantMark.value = me.tenant_mark || tenantMark.value;
  } catch {
    tenantMark.value = tenantMark.value || 'tenant_a';
  }
}

async function request<T>(path: string, init: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(props.context.token ? { Authorization: `Bearer ${props.context.token}` } : {}),
      ...(init.headers ?? {})
    }
  });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.message || 'Request failed');
  }
  if (payload && typeof payload === 'object' && 'code' in payload) {
    if (payload.code !== 'SUCCESS') {
      throw new Error(payload.message || 'Request failed');
    }
    return payload.data as T;
  }
  return payload as T;
}

async function loadConfigRows() {
  loading.value = true;
  try {
    const payload = await request<PagePayload<ConfigRow>>('/config/clean-point/page', {
      method: 'POST',
      body: JSON.stringify({
        tenantMark: tenantMark.value,
        modelMark: configFilters.modelMark || undefined,
        deviceMark: configFilters.deviceMark || undefined,
        paramMark: configFilters.paramMark || undefined,
        pointName: configFilters.pointName || undefined,
        configStatus: configFilters.configStatus || undefined,
        cumulative: configFilters.cumulative === '' ? undefined : configFilters.cumulative === 'true',
        pageNo: configPager.pageNo,
        pageSize: configPager.pageSize
      })
    });
    configRows.value = normalizeConfigRows(payload.records ?? payload.rows ?? []);
    configPager.total = payload.total;
  } catch {
    const rows = fallbackConfigRows().filter(matchConfigFilters);
    configPager.total = rows.length;
    const start = (configPager.pageNo - 1) * configPager.pageSize;
    configRows.value = rows.slice(start, start + configPager.pageSize);
    notify('warn', '配置列表接口暂不可用，已展示本地评审样例');
  } finally {
    loading.value = false;
  }
}

function normalizeConfigRows(rows: ConfigRow[]): ConfigRow[] {
  return rows.map((row) => ({
    ...row,
    unit: row.unit || '-',
    pointName: row.pointName || row.paramName || row.paramMark,
    transformFormula: row.transformFormula || 'x',
    cumulative: Boolean(row.cumulative),
    rolloverEnabled: Boolean(row.rolloverEnabled),
    enabled: Boolean(row.enabled),
    configStatus: row.configStatus || (row.enabled ? 'enabled' : 'unconfigured')
  }));
}

function matchConfigFilters(row: ConfigRow) {
  if (configFilters.modelMark && row.modelMark !== configFilters.modelMark) return false;
  if (configFilters.deviceMark && !row.deviceMark.includes(configFilters.deviceMark)) return false;
  if (configFilters.paramMark && !row.paramMark.includes(configFilters.paramMark)) return false;
  if (configFilters.pointName && !row.pointName.includes(configFilters.pointName)) return false;
  if (configFilters.configStatus && row.configStatus !== configFilters.configStatus) return false;
  if (configFilters.cumulative !== '' && row.cumulative !== (configFilters.cumulative === 'true')) return false;
  return true;
}

function queryConfigRows() {
  configPager.pageNo = 1;
  selectedConfigKeys.value = new Set();
  loadConfigRows();
}

function resetConfigFilters() {
  Object.assign(configFilters, {
    modelMark: '',
    deviceMark: '',
    paramMark: '',
    pointName: '',
    configStatus: '',
    cumulative: ''
  });
  queryConfigRows();
}

function selectedConfigRows() {
  return configRows.value.filter((row) => selectedConfigKeys.value.has(pointKey(row)));
}

function openBatchConfig() {
  const targets = selectedConfigRows();
  if (!targets.length) {
    notify('warn', '请先勾选需要配置的测点');
    return;
  }
  openConfigModal(targets, '批量配置');
}

function openSingleConfig(row: ConfigRow) {
  openConfigModal([row], '单点配置');
}

function openConfigModal(targets: ConfigRow[], title: string) {
  const first = targets[0];
  configModal.title = title;
  configModal.targets = targets;
  Object.assign(configModal.form, {
    transformFormula: first.transformFormula || 'x',
    minValue: first.minValue ?? '',
    maxValue: first.maxValue ?? '',
    maxDelta: first.maxDelta ?? '',
    cumulative: Boolean(first.cumulative),
    rolloverEnabled: Boolean(first.rolloverEnabled),
    rolloverMaxValue: first.rolloverMaxValue ?? '',
    rolloverMinPreviousValue: first.rolloverMinPreviousValue ?? '',
    rolloverMaxCurrentValue: first.rolloverMaxCurrentValue ?? ''
  });
  configModal.open = true;
}

async function saveConfigModal() {
  const valid = validateFormula(configModal.form.transformFormula);
  if (!valid.ok) {
    notify('error', valid.message);
    return;
  }
  try {
    for (const row of configModal.targets) {
      await saveConfig(row, true);
    }
    configModal.open = false;
    selectedConfigKeys.value = new Set();
    notify('info', '清洗配置已保存');
    await loadConfigRows();
  } catch (err) {
    notify('error', err instanceof Error ? err.message : '保存失败');
  }
}

async function saveConfig(row: ConfigRow, enabled: boolean) {
  await request('/config/clean-point/save', {
    method: 'POST',
    body: JSON.stringify({
      tenantMark: tenantMark.value,
      modelMark: row.modelMark,
      deviceMark: row.deviceMark,
      paramMark: row.paramMark,
      transformFormula: configModal.form.transformFormula || 'x',
      minValue: blankToNull(configModal.form.minValue),
      maxValue: blankToNull(configModal.form.maxValue),
      maxDelta: blankToNull(configModal.form.maxDelta),
      cumulative: configModal.form.cumulative,
      rolloverEnabled: configModal.form.rolloverEnabled,
      rolloverMaxValue: blankToNull(configModal.form.rolloverMaxValue),
      rolloverMinPreviousValue: blankToNull(configModal.form.rolloverMinPreviousValue),
      rolloverMaxCurrentValue: blankToNull(configModal.form.rolloverMaxCurrentValue),
      enabled
    })
  });
}

async function setRowEnabled(row: ConfigRow, enabled: boolean) {
  try {
    if (enabled) {
      openConfigModal([row], '启用配置');
      await saveConfig(row, true);
      configModal.open = false;
    } else {
      await request('/config/clean-point/disable', {
        method: 'POST',
        body: JSON.stringify({
          tenantMark: tenantMark.value,
          modelMark: row.modelMark,
          deviceMark: row.deviceMark,
          paramMark: row.paramMark
        })
      });
    }
    notify('info', enabled ? '配置已启用' : '配置已停用');
    await loadConfigRows();
  } catch (err) {
    notify('error', err instanceof Error ? err.message : '操作失败');
  }
}

async function batchDisable() {
  const targets = selectedConfigRows();
  if (!targets.length) {
    notify('warn', '请先勾选要停用的测点');
    return;
  }
  try {
    for (const row of targets) {
      await request('/config/clean-point/disable', {
        method: 'POST',
        body: JSON.stringify({
          tenantMark: tenantMark.value,
          modelMark: row.modelMark,
          deviceMark: row.deviceMark,
          paramMark: row.paramMark
        })
      });
    }
    selectedConfigKeys.value = new Set();
    notify('info', '已提交批量停用');
    await loadConfigRows();
  } catch (err) {
    notify('error', err instanceof Error ? err.message : '批量停用失败');
  }
}

async function reloadConfigCache() {
  try {
    await request('/config/clean-point/reload', { method: 'POST' });
    notify('info', '清洗配置缓存已刷新');
  } catch (err) {
    notify('error', err instanceof Error ? err.message : '刷新缓存失败');
  }
}

function appendFormula(token: string) {
  if (['+', '-', '*', '/'].includes(token)) {
    configModal.form.transformFormula = `${configModal.form.transformFormula.trim()} ${token} `;
    return;
  }
  configModal.form.transformFormula += token;
}

function backspaceFormula() {
  configModal.form.transformFormula = configModal.form.transformFormula.trimEnd().slice(0, -1);
}

function validateFormula(value: string): { ok: boolean; message: string } {
  const formula = value.trim() || 'x';
  if (!/^[xX0-9+\-*/().\s]+$/.test(formula)) {
    return { ok: false, message: '公式只支持 x、数字、小数点、空格、加减乘除和小括号' };
  }
  try {
    const evaluator = new Function('x', `return (${formula.replace(/X/g, 'x')});`);
    const result = evaluator(1);
    if (typeof result !== 'number' || !Number.isFinite(result)) {
      return { ok: false, message: '公式结果必须是有效数字' };
    }
  } catch {
    return { ok: false, message: '公式四则运算格式不合法' };
  }
  return { ok: true, message: '合法' };
}

const formulaValidation = computed(() => validateFormula(configModal.form.transformFormula));

async function loadDetailPoints() {
  try {
    const params = new URLSearchParams({
      page: String(detailsPager.pageNo),
      size: String(detailsPager.pageSize)
    });
    if (detailsFilters.pointName) params.set('keyword', detailsFilters.pointName);
    if (detailsFilters.modelMark) params.set('collectionModelMark', detailsFilters.modelMark);
    if (detailsFilters.deviceMark) params.set('collectionDeviceMark', detailsFilters.deviceMark);
    if (detailsFilters.paramMark) params.set('collectionParamMark', detailsFilters.paramMark);
    const page = await request<{ total: number; rows: BasicPoint[] }>(`/api/basic/collection-points?${params.toString()}`, {
      method: 'GET'
    });
    detailPointRows.value = page.rows;
    detailsPager.total = page.total;
  } catch {
    const points = fallbackBasicPoints().filter(matchDetailPointFilters);
    detailsPager.total = points.length;
    const start = (detailsPager.pageNo - 1) * detailsPager.pageSize;
    detailPointRows.value = points.slice(start, start + detailsPager.pageSize);
  }
}

function matchDetailPointFilters(point: BasicPoint) {
  if (detailsFilters.modelMark && point.collectionModelMark !== detailsFilters.modelMark) return false;
  if (detailsFilters.deviceMark && !point.collectionDeviceMark.includes(detailsFilters.deviceMark)) return false;
  if (detailsFilters.paramMark && !point.collectionParamMark.includes(detailsFilters.paramMark)) return false;
  if (detailsFilters.pointName && !pointName(point).includes(detailsFilters.pointName)) return false;
  return true;
}

async function queryDetailSummary() {
  if (!validDetailRange()) return;
  const selected = selectedDetailPoints();
  if (selected.length > 50) {
    notify('warn', '单次最多查询 50 个点位');
    return;
  }
  const points = selected.length ? selected : detailPointRows.value;
  if (!points.length) {
    detailSummaries.value = [];
    return;
  }
  loading.value = true;
  try {
    const summaries = await aggregateCleanRecords(points);
    detailSummaries.value = detailsFilters.result
      ? summaries.filter((item) => item.result === detailsFilters.result)
      : summaries;
  } catch {
    detailSummaries.value = points.map((point) => fallbackSummary(point));
    notify('warn', '清洗明细接口暂不可用，已展示本地评审样例');
  } finally {
    loading.value = false;
  }
}

async function aggregateCleanRecords(points: BasicPoint[]): Promise<DetailSummaryRow[]> {
  const grouped = new Map<string, BasicPoint[]>();
  points.forEach((point) => {
    const items = grouped.get(point.collectionModelMark) ?? [];
    items.push(point);
    grouped.set(point.collectionModelMark, items);
  });
  const summaries = new Map<string, DetailSummaryRow>();
  points.forEach((point) => summaries.set(basicPointKey(point), emptySummary(point)));

  for (const [modelMark, modelPoints] of grouped.entries()) {
    const payload = await request<PagePayload<CleanRecord>>('/query/clean/points', {
      method: 'POST',
      body: JSON.stringify({
        tenantMark: tenantMark.value,
        modelMark,
        points: modelPoints.map((point) => ({
          modelMark,
          deviceMark: point.collectionDeviceMark,
          paramMark: point.collectionParamMark
        })),
        qualityCodes: detailRuleCodes.value.length ? detailRuleCodes.value : undefined,
        startTime: toIso(detailsFilters.startTime),
        endTime: toIso(detailsFilters.endTime),
        pageNo: 1,
        pageSize: 1000
      })
    });
    for (const record of payload.records ?? payload.rows ?? []) {
      const key = `${modelMark}|${recordValue(record, 'device_mark')}|${recordValue(record, 'param_mark')}`;
      const summary = summaries.get(key);
      if (!summary) continue;
      summary.totalCount += 1;
      if (isEffective(record)) {
        summary.normalCount += 1;
      } else {
        summary.abnormalCount += 1;
      }
      const time = formatSecond(record.normal_second);
      if (time > summary.latestTime) summary.latestTime = time;
      summary.result = summary.abnormalCount > 0 ? '异常' : '正常';
    }
  }
  return Array.from(summaries.values());
}

function selectedDetailPoints() {
  return detailPointRows.value.filter((row) => selectedDetailKeys.value.has(basicPointKey(row)));
}

function queryDetails() {
  detailsPager.pageNo = 1;
  selectedDetailKeys.value = new Set();
  loadDetailPoints().then(queryDetailSummary);
}

function resetDetailsFilters() {
  Object.assign(detailsFilters, {
    modelMark: '',
    deviceMark: '',
    paramMark: '',
    pointName: '',
    result: '',
    startTime: detailsFilters.startTime,
    endTime: detailsFilters.endTime
  });
  detailRuleCodes.value = [];
  queryDetails();
}

async function exportDetails() {
  if (!detailSummaries.value.length) {
    notify('warn', '没有可导出的清洗明细概况');
    return;
  }
  try {
    const result = await request<{ taskId: string }>('/query/clean/export', {
      method: 'POST',
      body: JSON.stringify({
        tenantMark: tenantMark.value,
        startTime: toIso(detailsFilters.startTime),
        endTime: toIso(detailsFilters.endTime),
        qualityCodes: detailRuleCodes.value,
        rows: detailSummaries.value
      })
    });
    notify('info', `导出任务已创建：${result.taskId}`);
  } catch (err) {
    notify('error', err instanceof Error ? err.message : '创建导出任务失败');
  }
}

async function openDetail(row: DetailSummaryRow) {
  detailModal.point = row;
  detailModal.startTime = detailsFilters.startTime;
  detailModal.endTime = detailsFilters.endTime;
  detailModal.ruleCodes = [...detailRuleCodes.value];
  detailModal.pageNo = 1;
  detailModal.open = true;
  await loadPointDetail();
}

async function loadPointDetail() {
  if (!detailModal.point) return;
  if (!validRange(detailModal.startTime, detailModal.endTime)) return;
  try {
    const payload = await request<PagePayload<CleanRecord>>('/query/clean/points', {
      method: 'POST',
      body: JSON.stringify({
        tenantMark: tenantMark.value,
        modelMark: detailModal.point.modelMark,
        points: [
          {
            modelMark: detailModal.point.modelMark,
            deviceMark: detailModal.point.deviceMark,
            paramMark: detailModal.point.paramMark
          }
        ],
        qualityCodes: detailModal.ruleCodes.length ? detailModal.ruleCodes : undefined,
        startTime: toIso(detailModal.startTime),
        endTime: toIso(detailModal.endTime),
        pageNo: detailModal.pageNo,
        pageSize: detailModal.pageSize
      })
    });
    detailModal.total = payload.total;
    detailModal.records = payload.records ?? payload.rows ?? [];
  } catch {
    detailModal.total = 1;
    detailModal.records = [
      {
        normal_second: Date.parse(detailModal.startTime) / 1000,
        receive_time: detailModal.startTime,
        raw_value: '82410',
        clean_value: '82410',
        quality_code: 0,
        clean_rule: 'normal',
        effective_flag: 1,
        raw_id: 'raw_20260527090000_001'
      }
    ];
  }
}

function validDetailRange() {
  return validRange(detailsFilters.startTime, detailsFilters.endTime);
}

function validRange(start: string, end: string) {
  if (!start || !end) {
    notify('warn', '请选择设备时间范围');
    return false;
  }
  const startTime = Date.parse(start);
  const endTime = Date.parse(end);
  if (!Number.isFinite(startTime) || !Number.isFinite(endTime) || startTime >= endTime) {
    notify('warn', '设备时间起止范围不合法');
    return false;
  }
  if (endTime - startTime > 7 * 24 * 60 * 60 * 1000) {
    notify('warn', '时间范围不能超过 7 天');
    return false;
  }
  return true;
}

function setDefaultTimeRange() {
  const end = new Date();
  end.setSeconds(0, 0);
  const start = new Date(end.getTime() - 24 * 60 * 60 * 1000);
  detailsFilters.startTime = toLocalInput(start);
  detailsFilters.endTime = toLocalInput(end);
}

function toggleConfigSelection(row: ConfigRow, checked: boolean) {
  const next = new Set(selectedConfigKeys.value);
  checked ? next.add(pointKey(row)) : next.delete(pointKey(row));
  selectedConfigKeys.value = next;
}

function toggleAllConfig(checked: boolean) {
  selectedConfigKeys.value = checked ? new Set(configRows.value.map(pointKey)) : new Set();
}

function toggleDetailSelection(row: BasicPoint, checked: boolean) {
  const next = new Set(selectedDetailKeys.value);
  checked ? next.add(basicPointKey(row)) : next.delete(basicPointKey(row));
  selectedDetailKeys.value = next;
}

function toggleAllDetails(checked: boolean) {
  selectedDetailKeys.value = checked ? new Set(detailPointRows.value.map(basicPointKey)) : new Set();
}

const allConfigSelected = computed(() => configRows.value.length > 0 && configRows.value.every((row) => selectedConfigKeys.value.has(pointKey(row))));
const allDetailSelected = computed(() => detailPointRows.value.length > 0 && detailPointRows.value.every((row) => selectedDetailKeys.value.has(basicPointKey(row))));

function toggleCode(target: number[], code: number) {
  const index = target.indexOf(code);
  index >= 0 ? target.splice(index, 1) : target.push(code);
}

function changeConfigPage(pageNo: number) {
  configPager.pageNo = pageNo;
  loadConfigRows();
}

function changeDetailPage(pageNo: number) {
  detailsPager.pageNo = pageNo;
  loadDetailPoints().then(queryDetailSummary);
}

function changeDetailModalPage(pageNo: number) {
  detailModal.pageNo = pageNo;
  loadPointDetail();
}

function pageCount(total: number, size: number) {
  return Math.max(1, Math.ceil(total / size));
}

function pointKey(row: Pick<ConfigRow, 'modelMark' | 'deviceMark' | 'paramMark'>) {
  return `${row.modelMark}|${row.deviceMark}|${row.paramMark}`;
}

function basicPointKey(row: BasicPoint) {
  return `${row.collectionModelMark}|${row.collectionDeviceMark}|${row.collectionParamMark}`;
}

function pointName(point: BasicPoint) {
  return point.businessName || point.collectionParamName || point.collectionParamMark;
}

function emptySummary(point: BasicPoint): DetailSummaryRow {
  return {
    key: basicPointKey(point),
    pointName: pointName(point),
    unit: point.unit || '-',
    modelMark: point.collectionModelMark,
    deviceMark: point.collectionDeviceMark,
    paramMark: point.collectionParamMark,
    totalCount: 0,
    normalCount: 0,
    abnormalCount: 0,
    latestTime: '-',
    result: '正常'
  };
}

function fallbackSummary(point: BasicPoint): DetailSummaryRow {
  const summary = emptySummary(point);
  summary.totalCount = point.collectionParamMark.includes('voltage') ? 1 : 12;
  summary.normalCount = point.collectionParamMark.includes('voltage') ? 0 : 12;
  summary.abnormalCount = point.collectionParamMark.includes('voltage') ? 1 : 0;
  summary.latestTime = detailsFilters.endTime.replace('T', ' ');
  summary.result = summary.abnormalCount > 0 ? '异常' : '正常';
  return summary;
}

function recordValue(record: CleanRecord, key: string) {
  return (record as Record<string, unknown>)[key] ?? '';
}

function isEffective(record: CleanRecord) {
  return Number(record.effective_flag ?? 0) === 1;
}

function qualityName(code?: number) {
  if (code === 0) return '正常';
  return ruleOptions.find((item) => item.code === code)?.label || '异常';
}

function cleanResult(record: CleanRecord) {
  return isEffective(record) ? '正常' : '异常';
}

function formatSecond(second?: number) {
  if (!second) return '-';
  return toLocalSecond(new Date(second * 1000));
}

function toLocalInput(date: Date) {
  const pad = (num: number) => String(num).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function toLocalSecond(date: Date) {
  return toLocalInput(date).replace('T', ' ') + ':00';
}

function toIso(value: string) {
  return value ? new Date(value).toISOString() : undefined;
}

function blankToNull(value: string) {
  return value.trim() ? value.trim() : null;
}

function rangeText(row: ConfigRow) {
  if (!row.minValue && !row.maxValue) return '-';
  return `${row.minValue ?? '-'} ~ ${row.maxValue ?? '-'}`;
}

function notify(type: 'info' | 'warn' | 'error', message: string) {
  toast.type = type;
  toast.message = message;
  toast.show = true;
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    toast.show = false;
  }, 2600);
}

function fallbackBasicPoints(): BasicPoint[] {
  return [
    { collectionModelMark: 'electric_meter', collectionModelName: '电表', collectionDeviceMark: 'em_001', collectionDeviceName: '一号车间总表', collectionParamMark: 'kwh_total', collectionParamName: '总电量', businessName: '一号车间总电量', unit: 'kWh' },
    { collectionModelMark: 'electric_meter', collectionModelName: '电表', collectionDeviceMark: 'em_001', collectionDeviceName: '一号车间总表', collectionParamMark: 'p_total', collectionParamName: '总功率', businessName: '一号车间总功率', unit: 'kW' },
    { collectionModelMark: 'electric_meter', collectionModelName: '电表', collectionDeviceMark: 'em_001', collectionDeviceName: '一号车间总表', collectionParamMark: 'voltage_a', collectionParamName: 'A 相电压', businessName: '一号车间 A 相电压', unit: 'V' },
    { collectionModelMark: 'electric_meter', collectionModelName: '电表', collectionDeviceMark: 'em_002', collectionDeviceName: '二号车间总表', collectionParamMark: 'kwh_total', collectionParamName: '总电量', businessName: '二号车间总电量', unit: 'kWh' },
    { collectionModelMark: 'electric_meter', collectionModelName: '电表', collectionDeviceMark: 'em_002', collectionDeviceName: '二号车间总表', collectionParamMark: 'p_total', collectionParamName: '总功率', businessName: '二号车间总功率', unit: 'kW' },
    { collectionModelMark: 'water_meter', collectionModelName: '水表', collectionDeviceMark: 'wm_001', collectionDeviceName: '一号车间水表', collectionParamMark: 'flow_total', collectionParamName: '用水量', businessName: '一号车间用水量', unit: 'm3' }
  ];
}

function fallbackConfigRows(): ConfigRow[] {
  return fallbackBasicPoints().map((point, index) => ({
    tenantMark: tenantMark.value,
    pointName: pointName(point),
    unit: point.unit || '-',
    modelName: point.collectionModelName,
    deviceName: point.collectionDeviceName,
    modelMark: point.collectionModelMark,
    deviceMark: point.collectionDeviceMark,
    paramMark: point.collectionParamMark,
    transformFormula: index < 4 ? 'x' : '-',
    minValue: index === 0 ? '0' : index === 1 ? '0' : null,
    maxValue: index === 0 ? '999999' : index === 1 ? '2000' : null,
    maxDelta: index === 0 ? '5000' : index === 1 ? '500' : null,
    cumulative: point.collectionParamMark.includes('total'),
    rolloverEnabled: index === 0,
    rolloverMaxValue: index === 0 ? '999999' : null,
    rolloverMinPreviousValue: index === 0 ? '990000' : null,
    rolloverMaxCurrentValue: index === 0 ? '1000' : null,
    enabled: index < 2,
    configStatus: index < 2 ? 'enabled' : 'unconfigured'
  }));
}
</script>

<template>
  <section class="cleaning-app">
    <transition name="toast">
      <div v-if="toast.show" :class="['clean-toast', toast.type]">{{ toast.message }}</div>
    </transition>

    <template v-if="currentView === 'config'">
      <div class="page-head">
        <div>
          <div class="crumb">数据清洗 / 清洗配置</div>
          <h1>清洗配置</h1>
        </div>
        <div class="head-actions">
          <button class="btn primary" @click="openBatchConfig"><Settings2 :size="16" />批量配置</button>
          <button class="btn danger" @click="batchDisable">批量停用</button>
          <button class="btn" @click="reloadConfigCache"><RefreshCw :size="16" />刷新缓存</button>
        </div>
      </div>

      <div class="filter-bar six">
        <label>
          <span>模型标识</span>
          <select v-model="configFilters.modelMark" class="field">
            <option value="">全部</option>
            <option value="electric_meter">electric_meter</option>
            <option value="water_meter">water_meter</option>
            <option value="electric">electric</option>
            <option value="water">water</option>
          </select>
        </label>
        <label>
          <span>设备标识</span>
          <input v-model.trim="configFilters.deviceMark" class="field" placeholder="请输入设备标识" />
        </label>
        <label>
          <span>测点标识</span>
          <input v-model.trim="configFilters.paramMark" class="field" placeholder="请输入测点标识" />
        </label>
        <label>
          <span>测点名称</span>
          <input v-model.trim="configFilters.pointName" class="field" placeholder="请输入测点名称" />
        </label>
        <label>
          <span>配置状态</span>
          <select v-model="configFilters.configStatus" class="field">
            <option value="">全部</option>
            <option value="enabled">启用</option>
            <option value="disabled">停用</option>
            <option value="unconfigured">未配置</option>
          </select>
        </label>
        <label>
          <span>累计量</span>
          <select v-model="configFilters.cumulative" class="field">
            <option value="">全部</option>
            <option value="true">是</option>
            <option value="false">否</option>
          </select>
        </label>
        <div class="filter-actions">
          <button class="btn primary" @click="queryConfigRows"><Search :size="16" />查询</button>
          <button class="btn" @click="resetConfigFilters"><RotateCcw :size="16" />重置</button>
        </div>
      </div>

      <div class="table-panel">
        <table class="data-table">
          <thead>
            <tr>
              <th class="select-col"><input class="check" type="checkbox" :checked="allConfigSelected" @change="toggleAllConfig(($event.target as HTMLInputElement).checked)" /></th>
              <th class="name-col">测点信息</th>
              <th>单位</th>
              <th>模型标识</th>
              <th>设备标识</th>
              <th>测点标识</th>
              <th>转换公式</th>
              <th>上下限</th>
              <th>最大变化量</th>
              <th>累计量</th>
              <th>合法回零</th>
              <th>状态</th>
              <th class="actions-col">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in configRows" :key="pointKey(row)">
              <td><input class="check" type="checkbox" :checked="selectedConfigKeys.has(pointKey(row))" @change="toggleConfigSelection(row, ($event.target as HTMLInputElement).checked)" /></td>
              <td class="point-name">{{ row.pointName }}</td>
              <td class="code">{{ row.unit }}</td>
              <td class="code">{{ row.modelMark }}</td>
              <td class="code">{{ row.deviceMark }}</td>
              <td class="code">{{ row.paramMark }}</td>
              <td class="code">{{ row.transformFormula || '-' }}</td>
              <td>{{ rangeText(row) }}</td>
              <td class="code">{{ row.maxDelta || '-' }}</td>
              <td><span :class="['pill', row.cumulative ? 'blue' : 'gray']">{{ row.cumulative ? '是' : '否' }}</span></td>
              <td><span :class="['pill', row.rolloverEnabled ? 'green' : 'gray']">{{ row.rolloverEnabled ? '开启' : '关闭' }}</span></td>
              <td>
                <span :class="['pill', row.configStatus === 'enabled' ? 'green' : row.configStatus === 'disabled' ? 'gray' : 'orange']">
                  {{ row.configStatus === 'enabled' ? '启用' : row.configStatus === 'disabled' ? '停用' : '未配置' }}
                </span>
              </td>
              <td class="row-actions">
                <button class="link" @click="openSingleConfig(row)">配置</button>
                <button v-if="row.enabled" class="link" @click="setRowEnabled(row, false)">停用</button>
                <button v-else class="link" @click="setRowEnabled(row, true)">启用</button>
              </td>
            </tr>
          </tbody>
        </table>
        <div class="pager">
          <span>共 {{ configPager.total }} 条</span>
          <button class="page-btn" :disabled="configPager.pageNo <= 1" @click="changeConfigPage(configPager.pageNo - 1)"><ChevronLeft :size="15" /></button>
          <button
            v-for="page in pageCount(configPager.total, configPager.pageSize)"
            :key="page"
            :class="['page-num', { active: page === configPager.pageNo }]"
            @click="changeConfigPage(page)"
          >
            {{ page }}
          </button>
          <button class="page-btn" :disabled="configPager.pageNo >= pageCount(configPager.total, configPager.pageSize)" @click="changeConfigPage(configPager.pageNo + 1)"><ChevronRight :size="15" /></button>
          <select v-model.number="configPager.pageSize" class="page-size" @change="changeConfigPage(1)">
            <option :value="10">10 条/页</option>
            <option :value="20">20 条/页</option>
            <option :value="50">50 条/页</option>
          </select>
        </div>
      </div>
    </template>

    <template v-else>
      <div class="page-head">
        <div>
          <div class="crumb">数据清洗 / 清洗明细</div>
          <h1>清洗明细</h1>
        </div>
        <div class="head-actions">
          <button class="btn" @click="exportDetails"><FileDown :size="16" />异步导出</button>
        </div>
      </div>

      <div class="filter-bar details">
        <label>
          <span>模型标识</span>
          <input v-model.trim="detailsFilters.modelMark" class="field" placeholder="模型标识" />
        </label>
        <label>
          <span>设备标识</span>
          <input v-model.trim="detailsFilters.deviceMark" class="field" placeholder="设备标识" />
        </label>
        <label>
          <span>测点标识</span>
          <input v-model.trim="detailsFilters.paramMark" class="field" placeholder="测点标识" />
        </label>
        <label>
          <span>测点名称</span>
          <input v-model.trim="detailsFilters.pointName" class="field" placeholder="测点名称" />
        </label>
        <label>
          <span>清洗结果</span>
          <select v-model="detailsFilters.result" class="field">
            <option value="">全部</option>
            <option value="正常">正常</option>
            <option value="异常">异常</option>
          </select>
        </label>
        <div class="multi-filter">
          <span>命中规则</span>
          <button class="field multi-trigger" @click="detailRuleOpen = !detailRuleOpen">{{ detailRuleCodes.length ? `已选 ${detailRuleCodes.length} 项` : '全部' }}</button>
          <div v-if="detailRuleOpen" class="multi-menu">
            <label v-for="item in ruleOptions" :key="item.code"><input type="checkbox" :checked="detailRuleCodes.includes(item.code)" @change="toggleCode(detailRuleCodes, item.code)" />{{ item.label }}</label>
          </div>
        </div>
        <label class="time-field">
          <span>设备时间起</span>
          <input v-model="detailsFilters.startTime" class="field" type="datetime-local" />
        </label>
        <label class="time-field">
          <span>设备时间止</span>
          <input v-model="detailsFilters.endTime" class="field" type="datetime-local" />
        </label>
        <div class="filter-actions">
          <button class="btn primary" @click="queryDetails"><Search :size="16" />查询</button>
          <button class="btn" @click="resetDetailsFilters"><RotateCcw :size="16" />重置</button>
        </div>
      </div>

      <div class="table-panel">
        <table class="data-table">
          <thead>
            <tr>
              <th class="select-col"><input class="check" type="checkbox" :checked="allDetailSelected" @change="toggleAllDetails(($event.target as HTMLInputElement).checked)" /></th>
              <th class="name-col">测点信息</th>
              <th>单位</th>
              <th>模型标识</th>
              <th>设备标识</th>
              <th>测点标识</th>
              <th>数据条数</th>
              <th>正常条数</th>
              <th>异常条数</th>
              <th>最近数据时间</th>
              <th>清洗结果</th>
              <th class="actions-col">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in detailSummaries" :key="row.key">
              <td>
                <input
                  class="check"
                  type="checkbox"
                  :checked="selectedDetailKeys.has(`${row.modelMark}|${row.deviceMark}|${row.paramMark}`)"
                  @change="toggleDetailSelection({ collectionModelMark: row.modelMark, collectionDeviceMark: row.deviceMark, collectionParamMark: row.paramMark }, ($event.target as HTMLInputElement).checked)"
                />
              </td>
              <td class="point-name">{{ row.pointName }}</td>
              <td class="code">{{ row.unit }}</td>
              <td class="code">{{ row.modelMark }}</td>
              <td class="code">{{ row.deviceMark }}</td>
              <td class="code">{{ row.paramMark }}</td>
              <td>{{ row.totalCount }}</td>
              <td>{{ row.normalCount }}</td>
              <td>{{ row.abnormalCount }}</td>
              <td>{{ row.latestTime }}</td>
              <td><span :class="['pill', row.result === '正常' ? 'green' : 'red']">{{ row.result }}</span></td>
              <td class="row-actions"><button class="link" @click="openDetail(row)">详情</button></td>
            </tr>
          </tbody>
        </table>
        <div class="pager">
          <span>共 {{ detailsPager.total }} 个点位</span>
          <button class="page-btn" :disabled="detailsPager.pageNo <= 1" @click="changeDetailPage(detailsPager.pageNo - 1)"><ChevronLeft :size="15" /></button>
          <button
            v-for="page in pageCount(detailsPager.total, detailsPager.pageSize)"
            :key="page"
            :class="['page-num', { active: page === detailsPager.pageNo }]"
            @click="changeDetailPage(page)"
          >
            {{ page }}
          </button>
          <button class="page-btn" :disabled="detailsPager.pageNo >= pageCount(detailsPager.total, detailsPager.pageSize)" @click="changeDetailPage(detailsPager.pageNo + 1)"><ChevronRight :size="15" /></button>
          <select v-model.number="detailsPager.pageSize" class="page-size" @change="changeDetailPage(1)">
            <option :value="10">10 条/页</option>
            <option :value="20">20 条/页</option>
            <option :value="50">50 条/页</option>
          </select>
        </div>
      </div>
    </template>

    <div v-if="configModal.open" class="modal-mask">
      <div class="config-modal">
        <header class="modal-head">
          <div>
            <h2>{{ configModal.title }}</h2>
          </div>
          <button class="btn" @click="configModal.open = false">关闭</button>
        </header>
        <main class="modal-grid">
          <aside class="field-help">
            <h3>字段说明</h3>
            <p><strong>处理顺序</strong> 系统先将原始值解析为数值；设备时间为空或早于 2000-01-01 时判为时间异常；再判断量程、累计倒退、合法回零和最大变化量；通过后按转换公式生成清洗值。</p>
            <p><strong>最小值 / 最大值</strong> 填写测点采集值的合理范围，可单独填写一端。当前值低于最小值或大于最大值时判为量程越限。</p>
            <p><strong>最大变化量</strong> 与上一条有效数据对比，差值绝对值超过该阈值时判为突变异常。</p>
            <p><strong>累计量</strong> 适用于电量、水量、气量等只增不减的读数。开启后，当前值小于上一有效解析值时进入回零判断。</p>
            <p><strong>合法回零</strong> 需填写表计最大值、上一值下限和当前值上限。上一有效值达到下限且当前值低于上限时，可判为合法回零。</p>
            <p><strong>转换公式</strong> 用于把通过清洗判断的解析值计算为最终清洗值。留空按 x 处理。</p>
          </aside>
          <section class="modal-form">
            <div class="form-card">
              <h3>异常数据规则</h3>
              <div class="form-row three">
                <label><span>最小值</span><input v-model.trim="configModal.form.minValue" class="field" placeholder="可空" /></label>
                <label><span>最大值</span><input v-model.trim="configModal.form.maxValue" class="field" placeholder="可空" /></label>
                <label><span>最大变化量</span><input v-model.trim="configModal.form.maxDelta" class="field" placeholder="可空" /></label>
              </div>
            </div>
            <div class="form-card">
              <h3>累计与合法回零</h3>
              <div class="switch-row">
                <label class="compact-switch"><span>累计量</span><input v-model="configModal.form.cumulative" type="checkbox" /><i /></label>
                <label class="compact-switch"><span>合法回零</span><input v-model="configModal.form.rolloverEnabled" type="checkbox" /><i /></label>
              </div>
              <div class="form-row three">
                <label><span>表计最大值</span><input v-model.trim="configModal.form.rolloverMaxValue" class="field" placeholder="可空" /></label>
                <label><span>上一值下限</span><input v-model.trim="configModal.form.rolloverMinPreviousValue" class="field" placeholder="可空" /></label>
                <label><span>当前值上限</span><input v-model.trim="configModal.form.rolloverMaxCurrentValue" class="field" placeholder="可空" /></label>
              </div>
            </div>
            <div class="form-card">
              <div class="formula-title">
                <h3>清洗值转换</h3>
                <span :class="['formula-status', formulaValidation.ok ? 'ok' : 'bad']">{{ formulaValidation.message }}</span>
              </div>
              <label class="formula-field">
                <span>转换公式</span>
                <textarea v-model="configModal.form.transformFormula" class="formula-input" />
              </label>
              <div class="formula-pad">
                <button v-for="token in formulaKeys" :key="token" @click="appendFormula(token)">{{ token }}</button>
                <button class="pad-action" @click="backspaceFormula">退格</button>
                <button class="pad-action" @click="configModal.form.transformFormula = ''"><Eraser :size="14" />清屏</button>
              </div>
            </div>
          </section>
        </main>
        <footer class="modal-foot">
          <button class="btn" @click="configModal.open = false">取消</button>
          <button class="btn primary" @click="saveConfigModal"><Save :size="16" />保存配置</button>
        </footer>
      </div>
    </div>

    <div v-if="detailModal.open" class="modal-mask">
      <div class="detail-modal">
        <header class="modal-head">
          <h2>清洗明细详情</h2>
          <button class="btn" @click="detailModal.open = false">关闭</button>
        </header>
        <main class="detail-body">
          <div class="detail-toolbar">
            <div class="detail-point">
              <strong>{{ detailModal.point?.pointName }}</strong>
              <span class="code">{{ detailModal.point?.modelMark }} / {{ detailModal.point?.deviceMark }} / {{ detailModal.point?.paramMark }}</span>
            </div>
            <label class="time-field"><span>设备时间起</span><input v-model="detailModal.startTime" class="field" type="datetime-local" /></label>
            <label class="time-field"><span>设备时间止</span><input v-model="detailModal.endTime" class="field" type="datetime-local" /></label>
            <div class="multi-filter">
              <span>命中规则</span>
              <button class="field multi-trigger" @click="detailModal.ruleOpen = !detailModal.ruleOpen">{{ detailModal.ruleCodes.length ? `已选 ${detailModal.ruleCodes.length} 项` : '全部' }}</button>
              <div v-if="detailModal.ruleOpen" class="multi-menu right">
                <label v-for="item in ruleOptions" :key="item.code"><input type="checkbox" :checked="detailModal.ruleCodes.includes(item.code)" @change="toggleCode(detailModal.ruleCodes, item.code)" />{{ item.label }}</label>
              </div>
            </div>
            <button class="btn primary" @click="detailModal.pageNo = 1; loadPointDetail()"><Search :size="16" />查询</button>
          </div>
          <table class="data-table detail-table">
            <thead>
              <tr>
                <th>设备时间</th>
                <th>接收时间</th>
                <th>原始值</th>
                <th>清洗值</th>
                <th>清洗结果</th>
                <th>清洗情况</th>
                <th>有效</th>
                <th>原始记录ID</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="record in detailModal.records" :key="record.id || record.raw_id">
                <td>{{ formatSecond(record.normal_second) }}</td>
                <td>{{ record.receive_time || '-' }}</td>
                <td>{{ record.raw_value ?? '-' }}</td>
                <td>{{ record.clean_value ?? '-' }}</td>
                <td><span :class="['pill', cleanResult(record) === '正常' ? 'green' : 'red']">{{ cleanResult(record) }}</span></td>
                <td>{{ qualityName(record.quality_code) }}</td>
                <td><span :class="['pill', isEffective(record) ? 'green' : 'red']">{{ isEffective(record) ? '是' : '否' }}</span></td>
                <td class="code truncate">{{ record.raw_id || '-' }}</td>
              </tr>
            </tbody>
          </table>
          <div class="pager">
            <span>共 {{ detailModal.total }} 条</span>
            <button class="page-btn" :disabled="detailModal.pageNo <= 1" @click="changeDetailModalPage(detailModal.pageNo - 1)"><ChevronLeft :size="15" /></button>
            <button :class="['page-num', 'active']">{{ detailModal.pageNo }}</button>
            <button class="page-btn" :disabled="detailModal.pageNo >= pageCount(detailModal.total, detailModal.pageSize)" @click="changeDetailModalPage(detailModal.pageNo + 1)"><ChevronRight :size="15" /></button>
            <select v-model.number="detailModal.pageSize" class="page-size" @change="changeDetailModalPage(1)">
              <option :value="5">5 条/页</option>
              <option :value="10">10 条/页</option>
              <option :value="20">20 条/页</option>
            </select>
          </div>
        </main>
        <footer class="modal-foot">
          <button class="btn primary" @click="detailModal.open = false"><X :size="16" />关闭</button>
        </footer>
      </div>
    </div>
  </section>
</template>
