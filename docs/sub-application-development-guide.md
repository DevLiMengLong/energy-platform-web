# 子应用开发规范

本文档用于新增子应用前快速对齐工程约定，避免每次从头通读整个仓库。除非要改共享能力，否则新增子应用时优先阅读本文和“最小阅读清单”中的文件。

## 1. 当前架构

本仓库是 npm workspaces 管理的 Vue 3 + Vite 前端 monorepo。

- `apps/portal`：门户壳，负责登录、用户信息、顶部模块、左侧菜单、页签、语言状态和子应用挂载。
- `apps/platform-admin`：平台管理子应用，当前以共享 `PageConfig` 驱动平台管理页面。
- `apps/basic-info`：基础信息子应用，当前以共享 `PageConfig` 驱动基础资料页面，并包含组织树、领域树等复合布局。
- `apps/data-cleaning`：数据清洗子应用，采用领域定制页面。
- `packages/shared`：共享 API 客户端、类型、枚举显示、页面配置、表格列宽工具、基础样式和通用控件。

门户与子应用之间只通过 `MicroAppContext` 和 `mount(container, context)` 交互。子应用不能反向依赖门户内部状态，也不要直接读门户组件里的变量。

```ts
export interface MicroAppContext {
  apiBase: string;
  token: string;
  routePath: string;
  language: 'zh' | 'en';
}

export interface MicroAppHandle {
  unmount(): void;
}

export type MountMicroApp = (container: HTMLElement, context: MicroAppContext) => MicroAppHandle;
```

## 2. 最小阅读清单

新增子应用通常只需要看这些文件：

- 根工程约定：`README.md`、`package.json`、`tsconfig.base.json`。
- 门户接入点：`apps/portal/src/components/MicroAppHost.vue`、`apps/portal/package.json`。
- 子应用模板：通用 CRUD 类看 `apps/basic-info/src/micro.ts`、`apps/basic-info/src/main.ts`、`apps/basic-info/src/App.vue`；领域定制类看 `apps/data-cleaning/src/App.vue`。
- 共享契约：`packages/shared/src/types.ts`、`packages/shared/src/api.ts`、`packages/shared/src/styles.css`。
- 如果使用配置化页面：`packages/shared/src/page-configs.ts`、`packages/shared/src/enum-labels.ts`、`packages/shared/src/table-columns.ts`。

不需要优先阅读 `dist/`、`node_modules/` 或已构建产物。

## 3. 新增子应用流程

### 3.1 先确定接入契约

新增前先明确以下信息，并写在任务说明或开发记录里：

- 子应用目录名，例如 `apps/report-analysis`。
- npm 包名，例如 `@energy-platform/report-analysis`。
- 门户模块编码，例如 `report`。这个值必须和后端菜单接口返回的 `ModuleMenus.code` 一致。
- 路由前缀，例如 `/report/...`。
- 本地 dev 端口和 preview 端口，避免与现有 `5173`、`5174`、`5175`、`5176` 冲突。
- 需要代理的后端前缀，例如 `/api/basic`、`/api/platform`、`/config`、`/query`。
- 页面实现方式：共享 `PageConfig` 驱动，还是领域定制组件。
- PRD/原型中的页面、筛选项、表格列、顶部按钮、行按钮、弹窗、导入导出和权限点。

如果有 HTML 原型或截图，先整理页面追踪矩阵，不要只按视觉相似度开发。

### 3.2 创建子应用目录

推荐以现有子应用为模板复制结构：

```text
apps/<app-name>/
  index.html
  package.json
  tsconfig.json
  vite.config.ts
  src/
    App.vue
    main.ts
    micro.ts
    workspace.css
```

`package.json` 必须暴露 `./micro`，并提供 `dev`、`build`、`preview`：

```json
{
  "name": "@energy-platform/<app-name>",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "exports": {
    "./micro": "./src/micro.ts"
  },
  "scripts": {
    "dev": "vite --host 0.0.0.0 --port <dev-port>",
    "build": "vue-tsc --noEmit && vite build",
    "preview": "vite preview --host 0.0.0.0 --port <preview-port>"
  },
  "dependencies": {
    "@energy-platform/shared": "0.1.0"
  }
}
```

`vite.config.ts` 的构建产物必须保持 `assets/entry.js`，门户生产环境按这个路径动态导入：

```ts
build: {
  outDir: 'dist',
  emptyOutDir: true,
  lib: {
    entry: fileURLToPath(new URL('./src/micro.ts', import.meta.url)),
    formats: ['es'],
    fileName: () => 'assets/entry.js'
  }
}
```

`src/micro.ts` 保持统一挂载/卸载模式：

```ts
import { createApp } from 'vue';
import '@energy-platform/shared/styles.css';
import './workspace.css';
import type { MicroAppContext, MicroAppHandle } from '@energy-platform/shared';
import App from './App.vue';

export function mount(container: HTMLElement, context: MicroAppContext): MicroAppHandle {
  const app = createApp(App, { context });
  app.mount(container);
  return {
    unmount() {
      app.unmount();
      container.innerHTML = '';
    }
  };
}
```

`src/main.ts` 只用于子应用独立调试，真实运行时以门户传入的 `context` 为准。

### 3.3 接入门户

需要同步修改：

- `apps/portal/package.json`：添加新子应用 workspace 依赖。
- `apps/portal/src/components/MicroAppHost.vue`：在 `loadMount(code)` 中增加模块编码映射。
- 后端菜单/权限数据：确保 `/basic/me/menus` 返回的新模块 `code` 和前端映射一致，菜单 `routePath` 落在该子应用路由前缀下。
- 部署静态资源：生产环境需要能访问 `/<app-name>/assets/entry.js`。

门户接入示例：

```ts
if (code === '<module-code>') {
  if (import.meta.env.DEV) {
    return (await import('@energy-platform/<app-name>/micro')).mount;
  }
  const entry = '/<app-name>/assets/entry.js';
  return (await import(/* @vite-ignore */ entry)).mount;
}
```

## 4. 页面开发规范

### 4.1 优先使用共享上下文

子应用组件通过 props 接收上下文：

```ts
const props = defineProps<{ context: MicroAppContext }>();
```

- API base、token、routePath、language 都从 `context` 取。
- 业务请求优先使用 `ApiClient`；特殊后端返回格式才在子应用内封装局部 request。
- `routePath` 变化时重新加载当前页面数据。
- 文案使用 `pickLabel(language, zh, en)` 或等价封装，不要写死单语言。

### 4.2 页面配置化约定

通用管理页优先抽象为 `PageConfig`：

- `routePath`：和菜单返回路径一致。
- `endpoint`：列表或树接口。
- `mode`：普通表格省略；树表使用 `treeTable`；纯树使用 `tree`。
- `filters`：查询区字段。
- `columns`：表格列；操作列使用 `type: 'actions'`。
- `topActions`：顶部按钮，必须明确 `kind`、`key`，需要选中记录时设置 `requiresSelection`。
- `rowActions`：行按钮，不要用静态文本模拟。
- `create` / `edit`：只放用户可编辑字段。

表单字段不能从表格列直接照搬。创建/编辑表单应排除列表专用、审计、统计、登录历史、生命周期和后端计算字段，例如创建时间、更新时间、最近登录、初始化状态、成员数、权限数量、来源等，除非 PRD 明确要求用户维护。

### 4.3 动作必须是交互契约

原型中的每个顶部按钮和行操作都要落到以下任一明确结果：

- 打开抽屉/弹窗；
- 发起 API；
- 触发下载；
- 进入可解释的禁用状态；
- 明确记录延期原因。

不要只渲染 `编辑 / 停用` 这类文本。状态相关动作要按当前行状态反转，例如启用记录显示停用，停用记录显示启用，并提交对应语义的 payload。

### 4.4 枚举和主数据

- 所有用户可见面都要做枚举本地化，包括表格、详情、编辑、新增、确认弹窗、导入导出弹窗、权限弹窗和只读字段。
- 新枚举优先补充到 `packages/shared/src/enum-labels.ts`。
- 租户、组织、角色、能源类型、统计模型、产能中心、设备、采集点等主数据引用字段应使用可搜索选择器，并提交稳定 id/code，不要让用户自由输入展示名。
- 新绑定应过滤禁用或删除的数据，除非业务明确允许。

### 4.5 样式和布局

- 子应用必须引入 `@energy-platform/shared/styles.css`。
- 通用按钮、输入框、表格、空状态优先复用 `ep-*` 样式。
- 图标使用 `lucide-vue-next`。
- 页面高度应适配门户容器，避免让浏览器 body 滚动；大表格滚动应限制在表格区域。
- 卡片、弹窗、抽屉半径保持克制，当前通用控件以 `6px` 到 `8px` 为主。
- 文本必须在移动端和窄列下不溢出；表格列宽可使用 `useResizableTableColumns`。

### 4.6 复合布局

如果原型定义了业务树或左树右表结构，必须按页面级验收规格实现：

- 层级、缩进、展开/收起；
- 选中节点状态；
- 右侧数据跟随左侧节点变化；
- 右侧顶部动作和行动作；
- 弹窗/抽屉与当前选中目标绑定。

不要把带业务树的页面简化成普通 CRUD 表，除非产品明确确认。

## 5. 共享包使用边界

放入 `packages/shared` 的内容应该满足至少一个条件：

- 门户和多个子应用都要使用；
- 类型是跨应用契约，例如 `MicroAppContext`、`PageConfig`；
- 枚举和格式化规则需要保持全局一致；
- 通用控件或样式已经有复用价值。

只被某个子应用使用的领域逻辑先留在子应用内。共享包变更要关注所有消费者，修改后至少运行 workspace typecheck。

## 6. API 和代理约定

- 标准 API 返回 `ApiResponse<T>`，成功码为 `SUCCESS`。
- `ApiClient.get` 会过滤 `undefined`、`null`、空字符串查询参数。
- 当前门户代理包含 `/api/basic`、`/api/platform`、`/api/logs`、`/config`、`/query` 等前缀；新子应用按实际后端补充自己的 `vite.config.ts` 代理。
- 权限、分配、重置、导入导出等动作如果后端暂未正式建模，可以先接通明确的动作受理 API，但不要留下没有 API 路径的假按钮。

## 7. 验收清单

新增子应用完成前，至少检查：

- workspace 能识别新包，`npm --workspace @energy-platform/<app-name> run build` 通过。
- 门户 `MicroAppHost` 能在开发环境动态导入新子应用。
- 生产构建产物存在 `dist/assets/entry.js`，且部署路径和门户动态导入路径一致。
- 后端菜单 `code`、`routePath`、权限点和前端配置一致。
- 进入门户后切换模块、切换菜单、刷新当前路由、切换语言都正常。
- 页面筛选、分页、表格滚动、列宽、空状态、错误态、loading 态正常。
- 所有顶部动作、行动作、批量动作都可点击并有明确结果。
- 需要选中记录的动作校验未选中、单选/多选限制、目标身份展示和提交 payload。
- 启用/停用等状态动作覆盖启用记录和停用记录。
- 新增/编辑表单字段语义正确，主数据字段是选择器，列表/审计/统计字段没有泄漏为可编辑项。
- 枚举码不直接出现在任何用户可见表面。
- 导出校验下载内容和导出范围；导入校验模板、文件类型、大小限制、文件名展示和错误提示。
- 带树页面校验树层级、缩进、展开/收起、选中状态和右侧联动。
- 验证产生的测试数据要清理，必要时恢复默认筛选、分页和登录状态。

## 8. 最小验证命令

文档或纯配置变更可做轻量检查；新增子应用或改共享包时至少运行：

```bash
npm --workspace @energy-platform/<app-name> run build
npm run typecheck
```

需要验证门户挂载时运行：

```bash
npm run dev:portal
npm --workspace @energy-platform/<app-name> run dev
```

如果只改一个已有子应用，优先运行该子应用 build，再根据是否触碰 shared 决定是否运行全 workspace typecheck。

## 9. 常见问题

- 忘记在 `apps/portal/package.json` 添加依赖：开发环境 `import('@energy-platform/<app-name>/micro')` 会失败。
- `MicroAppHost` 的 code 和后端模块 code 不一致：门户会显示“子系统暂未接入”。
- 构建入口不是 `assets/entry.js`：生产环境动态导入失败。
- 子应用直接读 localStorage token：门户切换账号或 token 更新后状态容易不一致。
- 原型动作只做成静态文字：回归会漏掉真实业务操作。
- 只测当前页面可见按钮：会漏掉 PRD/原型要求但未实现的动作。
- 只测表格枚举：抽屉、弹窗、导出、导入仍可能泄漏后端 raw code。
- 大表格滚动 body：会破坏门户壳布局和页签/菜单可用性。

## 10. 后续任务输入模板

以后要求新增子应用时，建议至少给出：

```text
子应用名称：
目录/包名：
模块 code：
路由前缀：
页面清单：
PRD/原型路径：
后端接口或 Swagger：
需要代理的后端前缀：
是否使用 PageConfig：
验收重点：
```

信息不全时，先按当前架构补齐接入契约，再进入编码。
