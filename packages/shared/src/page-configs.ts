import type { PageConfig } from './types';

const statusColumn = { key: 'status', labelZh: '状态', labelEn: 'Status', type: 'status' as const, width: '112px' };

export const platformPages: PageConfig[] = [
  {
    routePath: '/platform/tenants',
    titleZh: '租户管理',
    titleEn: 'Tenants',
    endpoint: '/platform/tenants',
    columns: [
      { key: 'tenantMark', labelZh: '租户标识', labelEn: 'Tenant Mark' },
      { key: 'tenantName', labelZh: '租户名称', labelEn: 'Tenant Name' },
      { key: 'industry', labelZh: '行业', labelEn: 'Industry' },
      { key: 'contactName', labelZh: '联系人', labelEn: 'Contact' },
      { key: 'initStatus', labelZh: '初始化', labelEn: 'Init' },
      statusColumn
    ],
    create: {
      titleZh: '新增租户',
      titleEn: 'Create Tenant',
      endpoint: '/platform/tenants',
      fields: [
        { key: 'tenantName', labelZh: '租户名称', labelEn: 'Tenant Name', required: true },
        { key: 'tenantMark', labelZh: '租户标识', labelEn: 'Tenant Mark' },
        { key: 'industry', labelZh: '行业', labelEn: 'Industry' },
        { key: 'contactName', labelZh: '联系人', labelEn: 'Contact' },
        { key: 'contactPhone', labelZh: '联系电话', labelEn: 'Phone' }
      ]
    }
  },
  {
    routePath: '/platform/tenant-admins',
    titleZh: '租户管理员管理',
    titleEn: 'Tenant Admins',
    endpoint: '/platform/tenant-admins',
    columns: [
      { key: 'tenantName', labelZh: '租户', labelEn: 'Tenant' },
      { key: 'account', labelZh: '账号', labelEn: 'Account' },
      { key: 'username', labelZh: '姓名', labelEn: 'Name' },
      { key: 'phone', labelZh: '手机', labelEn: 'Phone' },
      statusColumn
    ]
  },
  {
    routePath: '/platform/subsystems',
    titleZh: '子系统管理',
    titleEn: 'Subsystems',
    endpoint: '/platform/subsystems',
    columns: [
      { key: 'subsystemCode', labelZh: '编码', labelEn: 'Code' },
      { key: 'nameZh', labelZh: '中文名称', labelEn: 'Chinese Name' },
      { key: 'nameEn', labelZh: '英文名称', labelEn: 'English Name' },
      { key: 'entryUrl', labelZh: '入口', labelEn: 'Entry' },
      statusColumn
    ]
  },
  {
    routePath: '/platform/menus',
    titleZh: '菜单管理',
    titleEn: 'Menus',
    endpoint: '/platform/menus/tree',
    mode: 'tree',
    columns: [
      { key: 'nameZh', labelZh: '菜单名称', labelEn: 'Menu' },
      { key: 'permissionCode', labelZh: '权限编码', labelEn: 'Permission' },
      { key: 'routePath', labelZh: '路由', labelEn: 'Route' },
      statusColumn
    ]
  },
  {
    routePath: '/platform/tenant-permissions',
    titleZh: '租户权限分配',
    titleEn: 'Tenant Permissions',
    endpoint: '/platform/tenant-permissions',
    columns: [
      { key: 'tenantName', labelZh: '租户', labelEn: 'Tenant' },
      { key: 'subsystemCode', labelZh: '子系统', labelEn: 'Subsystem' },
      { key: 'permissionType', labelZh: '授权类型', labelEn: 'Type' },
      { key: 'permissionCode', labelZh: '权限编码', labelEn: 'Permission' },
      { key: 'granted', labelZh: '授权', labelEn: 'Granted', type: 'boolean' }
    ]
  }
];

export const basicPages: PageConfig[] = [
  {
    routePath: '/basic/org-nodes',
    titleZh: '组织管理',
    titleEn: 'Organizations',
    endpoint: '/basic/org-nodes/tree',
    mode: 'tree',
    columns: [
      { key: 'orgCode', labelZh: '组织编码', labelEn: 'Code' },
      { key: 'orgName', labelZh: '组织名称', labelEn: 'Name' },
      statusColumn
    ]
  },
  {
    routePath: '/basic/users',
    titleZh: '用户管理',
    titleEn: 'Users',
    endpoint: '/basic/users',
    columns: [
      { key: 'account', labelZh: '账号', labelEn: 'Account' },
      { key: 'username', labelZh: '姓名', labelEn: 'Name' },
      { key: 'orgName', labelZh: '组织', labelEn: 'Org' },
      { key: 'roleType', labelZh: '用户类型', labelEn: 'Type' },
      statusColumn
    ]
  },
  {
    routePath: '/basic/user-groups',
    titleZh: '用户组管理',
    titleEn: 'User Groups',
    endpoint: '/basic/user-groups',
    columns: [
      { key: 'groupCode', labelZh: '用户组编码', labelEn: 'Code' },
      { key: 'groupName', labelZh: '用户组名称', labelEn: 'Name' },
      { key: 'memberCount', labelZh: '成员数', labelEn: 'Members', type: 'number' },
      statusColumn
    ]
  },
  {
    routePath: '/basic/roles',
    titleZh: '角色权限',
    titleEn: 'Roles',
    endpoint: '/basic/roles',
    columns: [
      { key: 'roleCode', labelZh: '角色编码', labelEn: 'Code' },
      { key: 'roleName', labelZh: '角色名称', labelEn: 'Name' },
      { key: 'roleScope', labelZh: '范围', labelEn: 'Scope' },
      statusColumn
    ]
  },
  {
    routePath: '/basic/dictionaries',
    titleZh: '数据字典',
    titleEn: 'Dictionaries',
    endpoint: '/basic/dictionaries',
    columns: [
      { key: 'dictCode', labelZh: '字典编码', labelEn: 'Code' },
      { key: 'dictName', labelZh: '字典名称', labelEn: 'Name' },
      { key: 'itemCount', labelZh: '条目数', labelEn: 'Items', type: 'number' },
      statusColumn
    ]
  },
  {
    routePath: '/basic/energy-types',
    titleZh: '能源类型',
    titleEn: 'Energy Types',
    endpoint: '/basic/energy-types',
    columns: [
      { key: 'energyCode', labelZh: '能源编码', labelEn: 'Code' },
      { key: 'energyName', labelZh: '能源名称', labelEn: 'Name' },
      { key: 'energyUnit', labelZh: '单位', labelEn: 'Unit' },
      { key: 'standardCoalFactor', labelZh: '折标系数', labelEn: 'Coal Factor', type: 'number' },
      statusColumn
    ],
    create: {
      titleZh: '新增能源类型',
      titleEn: 'Create Energy Type',
      endpoint: '/basic/energy-types',
      fields: [
        { key: 'energyName', labelZh: '能源名称', labelEn: 'Energy Name', required: true },
        { key: 'energyUnit', labelZh: '单位', labelEn: 'Unit', required: true },
        { key: 'standardCoalFactor', labelZh: '折标系数', labelEn: 'Coal Factor', type: 'number' },
        { key: 'standardCoalUnit', labelZh: '折标单位', labelEn: 'Coal Unit' },
        { key: 'sortOrder', labelZh: '排序', labelEn: 'Sort', type: 'number' },
        { key: 'remark', labelZh: '备注', labelEn: 'Remark', type: 'textarea' }
      ]
    }
  },
  {
    routePath: '/basic/energy-prices',
    titleZh: '能源价格',
    titleEn: 'Energy Prices',
    endpoint: '/basic/energy-prices',
    columns: [
      { key: 'energyName', labelZh: '能源', labelEn: 'Energy' },
      { key: 'priceValue', labelZh: '价格', labelEn: 'Price', type: 'number' },
      { key: 'currency', labelZh: '币种', labelEn: 'Currency' },
      { key: 'effectiveDate', labelZh: '生效日期', labelEn: 'Effective Date' },
      statusColumn
    ]
  },
  {
    routePath: '/basic/device-models',
    titleZh: '设备模型',
    titleEn: 'Device Models',
    endpoint: '/basic/device-models',
    columns: [
      { key: 'modelMark', labelZh: '模型标识', labelEn: 'Model Mark' },
      { key: 'modelName', labelZh: '模型名称', labelEn: 'Model Name' },
      { key: 'modelType', labelZh: '类型', labelEn: 'Type' },
      { key: 'paramCount', labelZh: '参数数', labelEn: 'Params', type: 'number' },
      statusColumn
    ]
  },
  {
    routePath: '/basic/devices',
    titleZh: '设备管理',
    titleEn: 'Devices',
    endpoint: '/basic/devices',
    columns: [
      { key: 'deviceMark', labelZh: '设备标识', labelEn: 'Device Mark' },
      { key: 'deviceName', labelZh: '设备名称', labelEn: 'Device Name' },
      { key: 'modelName', labelZh: '模型', labelEn: 'Model' },
      { key: 'orgName', labelZh: '组织', labelEn: 'Org' },
      statusColumn
    ]
  },
  {
    routePath: '/basic/stat-models',
    titleZh: '统计模型',
    titleEn: 'Stat Models',
    endpoint: '/basic/stat-models',
    columns: [
      { key: 'statModelMark', labelZh: '模型标识', labelEn: 'Model Mark' },
      { key: 'statModelName', labelZh: '模型名称', labelEn: 'Model Name' },
      { key: 'dimensionType', labelZh: '维度', labelEn: 'Dimension' },
      statusColumn
    ]
  },
  {
    routePath: '/basic/capacity-centers',
    titleZh: '产能中心',
    titleEn: 'Capacity Centers',
    endpoint: '/basic/capacity-centers/tree',
    mode: 'tree',
    columns: [
      { key: 'centerCode', labelZh: '中心编码', labelEn: 'Code' },
      { key: 'centerName', labelZh: '中心名称', labelEn: 'Name' },
      { key: 'outputUnit', labelZh: '产量单位', labelEn: 'Output Unit' },
      { key: 'valueUnit', labelZh: '产值单位', labelEn: 'Value Unit' }
    ]
  },
  {
    routePath: '/basic/unit-consumption',
    titleZh: '单耗配置',
    titleEn: 'Unit Consumption',
    endpoint: '/basic/unit-consumption-relations',
    columns: [
      { key: 'centerName', labelZh: '产能中心', labelEn: 'Capacity Center' },
      { key: 'energyName', labelZh: '能源', labelEn: 'Energy' },
      { key: 'relationName', labelZh: '关联名称', labelEn: 'Relation' },
      statusColumn
    ]
  },
  {
    routePath: '/basic/indicators',
    titleZh: '指标配置',
    titleEn: 'Indicators',
    endpoint: '/basic/indicator-data',
    columns: [
      { key: 'indicatorCode', labelZh: '指标编码', labelEn: 'Code' },
      { key: 'indicatorName', labelZh: '指标名称', labelEn: 'Name' },
      { key: 'periodType', labelZh: '周期', labelEn: 'Period' },
      { key: 'dataValue', labelZh: '数值', labelEn: 'Value', type: 'number' }
    ]
  },
  {
    routePath: '/basic/collection-points',
    titleZh: '采集点位',
    titleEn: 'Collection Points',
    endpoint: '/basic/collection-points',
    columns: [
      { key: 'collectionModelName', labelZh: '采集模型', labelEn: 'Model' },
      { key: 'collectionDeviceName', labelZh: '采集设备', labelEn: 'Device' },
      { key: 'businessName', labelZh: '业务名称', labelEn: 'Business Name' },
      { key: 'collectionParamMark', labelZh: '点位标识', labelEn: 'Point Mark' },
      statusColumn
    ]
  },
  {
    routePath: '/basic/shifts',
    titleZh: '班次配置',
    titleEn: 'Shifts',
    endpoint: '/basic/shifts',
    columns: [
      { key: 'shiftCode', labelZh: '班次编码', labelEn: 'Code' },
      { key: 'shiftName', labelZh: '班次名称', labelEn: 'Name' },
      { key: 'startTime', labelZh: '开始', labelEn: 'Start' },
      { key: 'endTime', labelZh: '结束', labelEn: 'End' },
      statusColumn
    ],
    create: {
      titleZh: '新增班次',
      titleEn: 'Create Shift',
      endpoint: '/basic/shifts',
      fields: [
        { key: 'shiftName', labelZh: '班次名称', labelEn: 'Shift Name', required: true },
        { key: 'startTime', labelZh: '开始时间', labelEn: 'Start Time', type: 'time', required: true },
        { key: 'endTime', labelZh: '结束时间', labelEn: 'End Time', type: 'time', required: true },
        { key: 'crossDay', labelZh: '跨天', labelEn: 'Cross Day', type: 'boolean' }
      ]
    }
  }
];

export function findPage(pages: PageConfig[], routePath: string): PageConfig {
  return pages.find((page) => page.routePath === routePath) ?? pages[0];
}
