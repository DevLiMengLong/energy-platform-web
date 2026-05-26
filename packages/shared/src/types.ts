export type Language = 'zh' | 'en';

export interface ApiResponse<T> {
  code: string;
  message: string;
  traceId?: string;
  data: T;
}

export interface PageResult<T = Record<string, unknown>> {
  total: number;
  page: number;
  size: number;
  rows: T[];
}

export interface CurrentUser {
  id: number;
  tenant_id?: number | null;
  account: string;
  username: string;
  role_type: 'PLATFORM_ADMIN' | 'TENANT_ADMIN' | 'TENANT_USER';
  tenant_name?: string | null;
  tenant_mark?: string | null;
}

export interface MenuNode {
  id: number;
  code?: string;
  menuCode?: string;
  nameZh: string;
  nameEn: string;
  icon?: string;
  routePath?: string;
  children?: MenuNode[];
}

export interface ModuleMenus {
  id: number;
  code: string;
  nameZh: string;
  nameEn: string;
  entryUrl?: string;
  menus: MenuNode[];
}

export interface MicroAppContext {
  apiBase: string;
  token: string;
  routePath: string;
  language: Language;
}

export interface MicroAppHandle {
  unmount(): void;
}

export type MountMicroApp = (container: HTMLElement, context: MicroAppContext) => MicroAppHandle;

export interface ColumnConfig {
  key: string;
  labelZh: string;
  labelEn: string;
  width?: string;
  type?: 'status' | 'boolean' | 'datetime' | 'number';
}

export interface FormFieldConfig {
  key: string;
  labelZh: string;
  labelEn: string;
  type?: 'text' | 'number' | 'time' | 'textarea' | 'select' | 'boolean';
  required?: boolean;
  options?: Array<{ labelZh: string; labelEn: string; value: string | number | boolean }>;
}

export interface PageConfig {
  routePath: string;
  titleZh: string;
  titleEn: string;
  endpoint: string;
  mode?: 'table' | 'tree';
  columns?: ColumnConfig[];
  create?: {
    titleZh: string;
    titleEn: string;
    endpoint: string;
    fields: FormFieldConfig[];
  };
}
