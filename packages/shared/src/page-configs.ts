import type { FilterConfig, PageConfig } from './types';

const statusColumn = { key: 'status', labelZh: '状态', labelEn: 'Status', type: 'status' as const, width: '112px' };
const actionsColumn = { key: '_actions', labelZh: '操作', labelEn: 'Actions', type: 'actions' as const, width: '150px' };

const statusOptions = [
  { labelZh: '全部', labelEn: 'All', value: '' },
  { labelZh: '启用', labelEn: 'Enabled', value: 'ENABLED' },
  { labelZh: '停用', labelEn: 'Disabled', value: 'DISABLED' }
];

const initStatusOptions = [
  { labelZh: '全部', labelEn: 'All', value: '' },
  { labelZh: '已初始化', labelEn: 'Initialized', value: 'INITIALIZED' },
  { labelZh: '未初始化', labelEn: 'Not initialized', value: 'NOT_INITIALIZED' }
];

const authStatusOptions = [
  { labelZh: '全部', labelEn: 'All', value: '' },
  { labelZh: '已授权', labelEn: 'Authorized', value: 'AUTHORIZED' },
  { labelZh: '未授权', labelEn: 'Unauthorized', value: 'UNAUTHORIZED' }
];

const subsystemOptions = [
  { labelZh: '全部', labelEn: 'All', value: '' },
  { labelZh: '基础信息', labelEn: 'Basic Info', value: 'basic' },
  { labelZh: '数据采集', labelEn: 'Data Access', value: 'data-cleaning' },
  { labelZh: '报表分析', labelEn: 'Reports', value: 'report' }
];

const industryOptions = [
  { labelZh: '全部', labelEn: 'All', value: '' },
  { labelZh: '制造业', labelEn: 'Manufacturing', value: '制造业' },
  { labelZh: '能源管理', labelEn: 'Energy Management', value: '能源管理' },
  { labelZh: '电子制造', labelEn: 'Electronics', value: '电子制造' }
];

const roleOptions = [
  { labelZh: '全部', labelEn: 'All', value: '' },
  { labelZh: '租户超管', labelEn: 'Tenant Admin', value: '租户超管' },
  { labelZh: '能源主管', labelEn: 'Energy Manager', value: '能源主管' },
  { labelZh: '设备维护', labelEn: 'Device Operator', value: '设备维护' }
];

const modelTypeOptions = [
  { labelZh: '全部', labelEn: 'All', value: '' },
  { labelZh: '表计', labelEn: 'Meter', value: 'METER' },
  { labelZh: '设备', labelEn: 'Device', value: 'DEVICE' }
];

const dictTypeOptions = [
  { labelZh: '全部', labelEn: 'All', value: '' },
  { labelZh: '系统字典', labelEn: 'System', value: 'SYSTEM' },
  { labelZh: '业务字典', labelEn: 'Business', value: 'BUSINESS' }
];

const energyOptions = [
  { labelZh: '全部', labelEn: 'All', value: '' },
  { labelZh: '电', labelEn: 'Electricity', value: '电' },
  { labelZh: '水', labelEn: 'Water', value: '水' },
  { labelZh: '天然气', labelEn: 'Gas', value: '天然气' },
  { labelZh: '压缩空气', labelEn: 'Compressed Air', value: '压缩空气' },
  { labelZh: '热力', labelEn: 'Heat', value: '热力' }
];

const priceTypeOptions = [
  { labelZh: '全部', labelEn: 'All', value: '' },
  { labelZh: '平均价格', labelEn: 'Average', value: 'AVERAGE' },
  { labelZh: '分时价格', labelEn: 'Time of Use', value: 'TIME_OF_USE' }
];

const yesNoOptions = [
  { labelZh: '全部', labelEn: 'All', value: '' },
  { labelZh: '是', labelEn: 'Yes', value: '1' },
  { labelZh: '否', labelEn: 'No', value: '0' }
];

const bindingOptions = [
  { labelZh: '全部', labelEn: 'All', value: '' },
  { labelZh: '已绑定', labelEn: 'Bound', value: 'BOUND' },
  { labelZh: '未绑定', labelEn: 'Unbound', value: 'UNBOUND' }
];

function inputFilter(key: string, labelZh: string, labelEn: string): FilterConfig {
  return { key, labelZh, labelEn, type: 'input' };
}

function selectFilter(key: string, labelZh: string, labelEn: string, options: FilterConfig['options']): FilterConfig {
  return { key, labelZh, labelEn, type: 'select', options };
}

export const platformPages: PageConfig[] = [
  {
    routePath: '/platform/tenants',
    titleZh: '租户管理',
    titleEn: 'Tenants',
    endpoint: '/platform/tenants',
    filters: [
      inputFilter('keyword', '租户名称/标识', 'Tenant name/code'),
      selectFilter('industry', '行业类型', 'Industry', industryOptions),
      selectFilter('status', '状态', 'Status', statusOptions),
      selectFilter('initStatus', '初始化状态', 'Init Status', initStatusOptions),
      inputFilter('createdAt', '创建时间', 'Created At')
    ],
    columns: [
      { key: 'tenantMark', labelZh: '租户标识', labelEn: 'Tenant Mark' },
      { key: 'tenantName', labelZh: '租户名称', labelEn: 'Tenant Name' },
      { key: 'industry', labelZh: '行业', labelEn: 'Industry' },
      { key: 'initStatus', labelZh: '初始化状态', labelEn: 'Init Status' },
      statusColumn,
      actionsColumn
    ],
    create: {
      titleZh: '新增租户',
      titleEn: 'Create Tenant',
      endpoint: '/platform/tenants',
      fields: [
        { key: 'tenantName', labelZh: '租户名称', labelEn: 'Tenant Name', required: true },
        { key: 'tenantMark', labelZh: '租户标识', labelEn: 'Tenant Mark' },
        { key: 'industry', labelZh: '行业类型', labelEn: 'Industry' },
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
    filters: [
      inputFilter('tenantMark', '租户', 'Tenant'),
      inputFilter('keyword', '账号/姓名', 'Account/name'),
      selectFilter('status', '状态', 'Status', statusOptions),
      inputFilter('lastLoginAt', '最近登录', 'Last Login')
    ],
    columns: [
      { key: 'tenantMark', labelZh: '所属租户', labelEn: 'Tenant' },
      { key: 'account', labelZh: '管理员账号', labelEn: 'Admin Account' },
      { key: 'username', labelZh: '姓名', labelEn: 'Name' },
      { key: 'email', labelZh: '邮箱', labelEn: 'Email' },
      { key: 'lastLoginAt', labelZh: '最近登录', labelEn: 'Last Login' },
      statusColumn,
      actionsColumn
    ]
  },
  {
    routePath: '/platform/subsystems',
    titleZh: '子系统管理',
    titleEn: 'Subsystems',
    endpoint: '/platform/subsystems',
    filters: [inputFilter('keyword', '系统名称', 'System Name')],
    columns: [
      { key: 'nameZh', labelZh: '系统名称', labelEn: 'System Name' },
      { key: 'subsystemCode', labelZh: '系统标识', labelEn: 'System Code' },
      { key: 'description', labelZh: '描述', labelEn: 'Description' },
      { key: 'entryUrl', labelZh: '访问地址', labelEn: 'Entry URL' },
      statusColumn,
      actionsColumn
    ]
  },
  {
    routePath: '/platform/menus',
    titleZh: '菜单管理',
    titleEn: 'Menus',
    endpoint: '/platform/menus/tree',
    mode: 'treeTable',
    filters: [
      selectFilter('subsystemCode', '子系统', 'Subsystem', subsystemOptions),
      inputFilter('keyword', '菜单名称', 'Menu Name')
    ],
    columns: [
      { key: 'nameZh', labelZh: '菜单名称', labelEn: 'Menu Name', tree: true, width: '190px' },
      { key: 'menuCode', labelZh: '菜单标识', labelEn: 'Menu Code' },
      { key: 'permissionCode', labelZh: '权限标识', labelEn: 'Permission' },
      { key: 'componentPath', labelZh: '组件路径', labelEn: 'Component Path' },
      { key: 'routePath', labelZh: '路由地址', labelEn: 'Route' },
      { key: 'sortOrder', labelZh: '排序', labelEn: 'Sort', type: 'number', width: '78px' },
      { key: 'hidden', labelZh: '是否隐藏', labelEn: 'Hidden', type: 'visibility', width: '92px' },
      { key: 'createdAt', labelZh: '创建日期', labelEn: 'Created At' },
      actionsColumn
    ]
  },
  {
    routePath: '/platform/tenant-permissions',
    titleZh: '租户权限分配',
    titleEn: 'Tenant Permissions',
    endpoint: '/platform/tenant-permissions',
    filters: [
      inputFilter('keyword', '租户名称/标识', 'Tenant name/code'),
      selectFilter('subsystemCode', '子系统', 'Subsystem', subsystemOptions),
      selectFilter('authStatus', '授权状态', 'Auth Status', authStatusOptions)
    ],
    columns: [
      { key: 'tenantMark', labelZh: '租户标识', labelEn: 'Tenant Mark' },
      { key: 'tenantName', labelZh: '租户名称', labelEn: 'Tenant Name' },
      { key: 'subsystemNames', labelZh: '已开通子系统', labelEn: 'Granted Subsystems' },
      { key: 'permissionCount', labelZh: '菜单/按钮权限数', labelEn: 'Permissions', type: 'number' },
      { key: 'authStatus', labelZh: '授权状态', labelEn: 'Auth Status' },
      actionsColumn
    ]
  }
];

export const basicPages: PageConfig[] = [
  {
    routePath: '/basic/org-nodes',
    titleZh: '组织管理',
    titleEn: 'Organizations',
    endpoint: '/basic/org-nodes/tree',
    mode: 'treeTable',
    filters: [inputFilter('keyword', '组织名称/编码', 'Org name/code'), inputFilter('parentKeyword', '上级组织', 'Parent org')],
    columns: [
      { key: 'orgName', labelZh: '组织名称', labelEn: 'Org Name', tree: true },
      { key: 'orgCode', labelZh: '组织编码', labelEn: 'Org Code' },
      { key: 'sortOrder', labelZh: '排序', labelEn: 'Sort', type: 'number' },
      statusColumn,
      actionsColumn
    ]
  },
  {
    routePath: '/basic/users',
    titleZh: '用户管理',
    titleEn: 'Users',
    endpoint: '/basic/users',
    filters: [
      inputFilter('keyword', '账号/姓名', 'Account/name'),
      inputFilter('phone', '手机号', 'Phone'),
      inputFilter('email', '邮箱', 'Email'),
      selectFilter('roleName', '角色', 'Role', roleOptions),
      selectFilter('status', '状态', 'Status', statusOptions)
    ],
    columns: [
      { key: 'account', labelZh: '账号', labelEn: 'Account' },
      { key: 'username', labelZh: '姓名', labelEn: 'Name' },
      { key: 'phone', labelZh: '手机号', labelEn: 'Phone' },
      { key: 'email', labelZh: '邮箱', labelEn: 'Email' },
      { key: 'roleName', labelZh: '角色', labelEn: 'Role' },
      { key: 'orgName', labelZh: '所属组织', labelEn: 'Org' },
      statusColumn,
      actionsColumn
    ]
  },
  {
    routePath: '/basic/user-groups',
    titleZh: '用户组管理',
    titleEn: 'User Groups',
    endpoint: '/basic/user-groups',
    filters: [inputFilter('keyword', '用户组编码/名称', 'Group code/name'), selectFilter('status', '状态', 'Status', statusOptions)],
    columns: [
      { key: 'groupCode', labelZh: '用户组编码', labelEn: 'Code' },
      { key: 'groupName', labelZh: '用户组名称', labelEn: 'Name' },
      { key: 'memberCount', labelZh: '成员数', labelEn: 'Members', type: 'number' },
      { key: 'remark', labelZh: '备注', labelEn: 'Remark' },
      statusColumn,
      actionsColumn
    ]
  },
  {
    routePath: '/basic/roles',
    titleZh: '角色权限',
    titleEn: 'Roles',
    endpoint: '/basic/roles',
    filters: [
      inputFilter('keyword', '角色编码/名称', 'Role code/name'),
      selectFilter('status', '状态', 'Status', statusOptions),
      inputFilter('menuScope', '权限范围', 'Permission Scope'),
      inputFilter('createdAt', '创建时间', 'Created At')
    ],
    columns: [
      { key: 'roleCode', labelZh: '角色编码', labelEn: 'Code' },
      { key: 'roleName', labelZh: '角色名称', labelEn: 'Name' },
      { key: 'menuScope', labelZh: '菜单范围', labelEn: 'Menu Scope' },
      statusColumn,
      { key: 'userCount', labelZh: '用户数', labelEn: 'Users', type: 'number' },
      actionsColumn
    ]
  },
  {
    routePath: '/basic/dictionaries',
    titleZh: '数据字典',
    titleEn: 'Dictionaries',
    endpoint: '/basic/dictionaries',
    filters: [
      inputFilter('keyword', '字典编码/名称', 'Dict code/name'),
      selectFilter('dictType', '字典类型', 'Dict Type', dictTypeOptions),
      selectFilter('status', '状态', 'Status', statusOptions)
    ],
    columns: [
      { key: 'dictCode', labelZh: '字典编码', labelEn: 'Code' },
      { key: 'dictName', labelZh: '字典名称', labelEn: 'Name' },
      { key: 'dictType', labelZh: '字典类型', labelEn: 'Type' },
      { key: 'itemCount', labelZh: '字典项数量', labelEn: 'Items', type: 'number' },
      statusColumn,
      { key: 'remark', labelZh: '备注', labelEn: 'Remark' },
      actionsColumn
    ]
  },
  {
    routePath: '/basic/energy-types',
    titleZh: '能源类型',
    titleEn: 'Energy Types',
    endpoint: '/basic/energy-types',
    filters: [inputFilter('energyName', '能源名称', 'Energy Name'), inputFilter('energyUnit', '能源单位', 'Energy Unit')],
    columns: [
      { key: 'energyName', labelZh: '能源名称', labelEn: 'Name' },
      { key: 'energyUnit', labelZh: '能源单位', labelEn: 'Unit' },
      { key: 'standardCoalFactor', labelZh: '折标系数', labelEn: 'Coal Factor', type: 'number' },
      { key: 'standardCoalUnit', labelZh: '折标单位', labelEn: 'Coal Unit' },
      { key: 'sortOrder', labelZh: '排序', labelEn: 'Sort', type: 'number' },
      { key: 'icon', labelZh: '图标', labelEn: 'Icon' },
      { key: 'remark', labelZh: '备注', labelEn: 'Remark' },
      actionsColumn
    ],
    create: {
      titleZh: '新增能源类型',
      titleEn: 'Create Energy Type',
      endpoint: '/basic/energy-types',
      fields: [
        { key: 'energyName', labelZh: '能源名称', labelEn: 'Energy Name', required: true },
        { key: 'energyUnit', labelZh: '能源单位', labelEn: 'Unit', required: true },
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
    filters: [
      selectFilter('energyName', '能源类型', 'Energy Type', energyOptions),
      selectFilter('priceType', '价格类型', 'Price Type', priceTypeOptions),
      inputFilter('effectiveStart', '执行开始时间', 'Start Date'),
      inputFilter('effectiveEnd', '执行结束时间', 'End Date')
    ],
    columns: [
      { key: 'energyName', labelZh: '能源类型', labelEn: 'Energy' },
      { key: 'priceType', labelZh: '价格类型', labelEn: 'Price Type' },
      { key: 'periodName', labelZh: '时段', labelEn: 'Period' },
      { key: 'unitPrice', labelZh: '单价', labelEn: 'Unit Price', type: 'number' },
      { key: 'priceUnit', labelZh: '计价单位', labelEn: 'Price Unit' },
      { key: 'effectiveStart', labelZh: '执行开始时间', labelEn: 'Start Date' },
      { key: 'effectiveEnd', labelZh: '执行结束时间', labelEn: 'End Date' },
      statusColumn,
      actionsColumn
    ]
  },
  {
    routePath: '/basic/device-models',
    titleZh: '设备模型',
    titleEn: 'Device Models',
    endpoint: '/basic/device-models',
    filters: [
      inputFilter('keyword', '模型编码/名称', 'Model code/name'),
      selectFilter('modelType', '模型类型', 'Model Type', modelTypeOptions),
      selectFilter('status', '状态', 'Status', statusOptions)
    ],
    columns: [
      { key: 'modelCode', labelZh: '模型编码', labelEn: 'Model Code' },
      { key: 'modelName', labelZh: '模型名称', labelEn: 'Model Name' },
      { key: 'modelType', labelZh: '模型类型', labelEn: 'Type' },
      { key: 'paramCount', labelZh: '参数数量', labelEn: 'Params', type: 'number' },
      statusColumn,
      actionsColumn
    ]
  },
  {
    routePath: '/basic/devices',
    titleZh: '设备管理',
    titleEn: 'Devices',
    endpoint: '/basic/devices',
    filters: [
      inputFilter('keyword', '设备编码/名称', 'Device code/name'),
      inputFilter('modelName', '设备模型', 'Device Model'),
      selectFilter('bindingStatus', '参数绑定状态', 'Binding Status', bindingOptions)
    ],
    columns: [
      { key: 'modelType', labelZh: '模型类别', labelEn: 'Model Type' },
      { key: 'modelName', labelZh: '模型名称', labelEn: 'Model Name' },
      { key: 'modelCode', labelZh: '模型标识', labelEn: 'Model Code' },
      { key: 'deviceName', labelZh: '对象名称', labelEn: 'Device Name' },
      { key: 'deviceCode', labelZh: '对象标识', labelEn: 'Device Code' },
      { key: 'deviceLabel', labelZh: '对象标签', labelEn: 'Label' },
      { key: 'installLocation', labelZh: '安装位置', labelEn: 'Location' },
      actionsColumn
    ]
  },
  {
    routePath: '/basic/stat-models',
    titleZh: '统计模型',
    titleEn: 'Stat Models',
    endpoint: '/basic/stat-models',
    columns: [
      { key: 'energyName', labelZh: '能源类型', labelEn: 'Energy' },
      { key: 'statModelCode', labelZh: '统计模型编码', labelEn: 'Model Code' },
      { key: 'statModelName', labelZh: '统计模型名称', labelEn: 'Model Name' },
      statusColumn,
      actionsColumn
    ]
  },
  {
    routePath: '/basic/capacity-centers',
    titleZh: '产能中心',
    titleEn: 'Capacity Centers',
    endpoint: '/basic/capacity-data',
    columns: [
      { key: 'centerName', labelZh: '产能中心', labelEn: 'Capacity Center' },
      { key: 'dataType', labelZh: '数据类型', labelEn: 'Data Type' },
      { key: 'periodType', labelZh: '维护维度', labelEn: 'Period' },
      { key: 'dataTime', labelZh: '时间', labelEn: 'Time' },
      { key: 'dataValue', labelZh: '数值', labelEn: 'Value', type: 'number' },
      { key: 'unit', labelZh: '单位', labelEn: 'Unit' },
      { key: 'sourceType', labelZh: '来源', labelEn: 'Source' },
      actionsColumn
    ]
  },
  {
    routePath: '/basic/unit-consumption',
    titleZh: '单耗配置',
    titleEn: 'Unit Consumption',
    endpoint: '/basic/unit-consumption-relations',
    columns: [
      { key: 'centerCode', labelZh: '产能中心编码', labelEn: 'Center Code' },
      { key: 'centerName', labelZh: '产能中心名称', labelEn: 'Center Name' },
      { key: 'statNodeName', labelZh: '关联数据', labelEn: 'Related Data' },
      { key: 'outputUnit', labelZh: '产量单位', labelEn: 'Output Unit' },
      { key: 'valueUnit', labelZh: '产值单位', labelEn: 'Value Unit' },
      { key: 'peopleUnit', labelZh: '人数单位', labelEn: 'People Unit' },
      { key: 'areaUnit', labelZh: '面积单位', labelEn: 'Area Unit' },
      actionsColumn
    ]
  },
  {
    routePath: '/basic/indicators',
    titleZh: '指标配置',
    titleEn: 'Indicators',
    endpoint: '/basic/indicator-data',
    columns: [
      { key: 'statNodeName', labelZh: '统计节点', labelEn: 'Stat Node' },
      { key: 'indicatorCode', labelZh: '指标编码', labelEn: 'Code' },
      { key: 'indicatorName', labelZh: '指标名称', labelEn: 'Name' },
      { key: 'indicatorType', labelZh: '指标类型', labelEn: 'Indicator Type' },
      { key: 'periodType', labelZh: '维护维度', labelEn: 'Period' },
      { key: 'dataTime', labelZh: '时间', labelEn: 'Time' },
      { key: 'indicatorValue', labelZh: '指标值', labelEn: 'Value', type: 'number' },
      { key: 'unit', labelZh: '单位', labelEn: 'Unit' },
      { key: 'sourceType', labelZh: '来源', labelEn: 'Source' },
      actionsColumn
    ]
  },
  {
    routePath: '/basic/collection-points',
    titleZh: '采集点位',
    titleEn: 'Collection Points',
    endpoint: '/basic/collection-points',
    filters: [
      inputFilter('collectionModelMark', '模型标识', 'Model Mark'),
      inputFilter('collectionDeviceMark', '设备标识', 'Device Mark'),
      inputFilter('collectionParamMark', '参数标识', 'Param Mark'),
      inputFilter('businessName', '业务名称', 'Business Name')
    ],
    columns: [
      { key: 'collectionModelMark', labelZh: '采集模型标识', labelEn: 'Model Mark' },
      { key: 'collectionDeviceMark', labelZh: '采集设备标识', labelEn: 'Device Mark' },
      { key: 'collectionParamMark', labelZh: '采集参数标识', labelEn: 'Param Mark' },
      { key: 'businessName', labelZh: '业务名称', labelEn: 'Business Name' },
      actionsColumn
    ]
  },
  {
    routePath: '/basic/shifts',
    titleZh: '班次配置',
    titleEn: 'Shifts',
    endpoint: '/basic/shifts',
    filters: [
      inputFilter('keyword', '班次编码/名称', 'Shift code/name'),
      selectFilter('crossDay', '是否跨天', 'Cross Day', yesNoOptions),
      selectFilter('status', '启用状态', 'Status', statusOptions)
    ],
    columns: [
      { key: 'shiftCode', labelZh: '班次编码', labelEn: 'Code' },
      { key: 'shiftName', labelZh: '班次名称', labelEn: 'Name' },
      { key: 'startTime', labelZh: '开始时间', labelEn: 'Start' },
      { key: 'endTime', labelZh: '结束时间', labelEn: 'End' },
      { key: 'crossDay', labelZh: '跨天', labelEn: 'Cross Day', type: 'boolean' },
      actionsColumn
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
