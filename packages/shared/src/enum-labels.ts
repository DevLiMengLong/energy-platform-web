import type { Language } from './types';

type EnumLabel = {
  zh: string;
  en: string;
};

const enumLabels: Record<string, EnumLabel> = {
  ENABLED: { zh: '启用', en: 'Enabled' },
  DISABLED: { zh: '禁用', en: 'Disabled' },
  INITIALIZED: { zh: '已初始化', en: 'Initialized' },
  NOT_INITIALIZED: { zh: '未初始化', en: 'Not initialized' },
  AUTHORIZED: { zh: '已授权', en: 'Authorized' },
  UNAUTHORIZED: { zh: '未授权', en: 'Unauthorized' },

  PLATFORM_ADMIN: { zh: '平台管理员', en: 'Platform admin' },
  TENANT_ADMIN: { zh: '租户管理员', en: 'Tenant admin' },
  TENANT_USER: { zh: '租户用户', en: 'Tenant user' },
  TENANT: { zh: '租户', en: 'Tenant' },
  SYSTEM: { zh: '系统', en: 'System' },

  SUBSYSTEM: { zh: '子系统', en: 'Subsystem' },
  MENU: { zh: '菜单', en: 'Menu' },
  COMPONENT: { zh: '组件', en: 'Component' },

  DEVICE: { zh: '设备', en: 'Device' },
  METER: { zh: '仪表', en: 'Meter' },
  BUSINESS: { zh: '业务', en: 'Business' },
  STAT_MODEL: { zh: '统计模型', en: 'Stat model' },

  INSTANT: { zh: '瞬时量', en: 'Instant' },
  ACCUMULATED: { zh: '累计量', en: 'Accumulated' },
  NUMERIC: { zh: '数值', en: 'Numeric' },

  MANUAL: { zh: '手工录入', en: 'Manual' },
  IMPORT: { zh: '导入', en: 'Import' },
  DAY: { zh: '日', en: 'Day' },
  MONTH: { zh: '月', en: 'Month' },

  AVERAGE: { zh: '平均值', en: 'Average' },
  OUTPUT: { zh: '产量', en: 'Output' },
  UNIT_ENERGY: { zh: '单耗', en: 'Unit energy' },
  CAPACITY: { zh: '产能', en: 'Capacity' },
  ENERGY_USAGE: { zh: '用能量', en: 'Energy usage' },
  TIME_OF_USE: { zh: '分时价格', en: 'Time of use' },

  YES: { zh: '是', en: 'Yes' },
  NO: { zh: '否', en: 'No' }
};

const enumFieldKeys = new Set([
  'authStatus',
  'dataScope',
  'dataType',
  'dictType',
  'indicatorType',
  'initStatus',
  'modelType',
  'openType',
  'periodType',
  'permissionType',
  'priceType',
  'roleType',
  'sourceType',
  'status'
]);

function shouldFormatEnum(fieldKey?: string): boolean {
  if (!fieldKey) {
    return true;
  }
  return enumFieldKeys.has(fieldKey) || fieldKey.endsWith('Status') || fieldKey.endsWith('Type');
}

export function formatEnumLabel(value: unknown, language: Language): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const label = enumLabels[value];
  return label ? label[language] : null;
}

export function formatCellValue(value: unknown, language: Language, fieldKey?: string): string {
  if (value === null || value === undefined || value === '') {
    return '-';
  }
  if (typeof value === 'boolean') {
    return value ? (language === 'zh' ? '是' : 'Yes') : (language === 'zh' ? '否' : 'No');
  }
  if (shouldFormatEnum(fieldKey)) {
    return formatEnumLabel(value, language) ?? String(value);
  }
  return String(value);
}
