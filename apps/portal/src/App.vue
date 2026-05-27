<script setup lang="ts">
import {
  Activity,
  BadgeDollarSign,
  BookOpen,
  Boxes,
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Cpu,
  Factory,
  Gauge,
  GitBranch,
  KeyRound,
  Leaf,
  LogOut,
  Menu,
  Network,
  RadioTower,
  RefreshCw,
  Scale,
  SquareMenu,
  UserCog,
  Users,
  UsersRound,
  ShieldCheck,
  X
} from 'lucide-vue-next';
import { computed, onMounted, reactive, ref, type Component } from 'vue';
import { ApiClient, pickLabel, type CurrentUser, type Language, type MenuNode, type ModuleMenus } from '@energy-platform/shared';
import MicroAppHost from './components/MicroAppHost.vue';

interface LoginResponse {
  token: string;
  user: CurrentUser;
}

interface VisitedTab {
  moduleCode: string;
  routePath: string;
}

const token = ref(localStorage.getItem('energy_token') ?? '');
const user = ref<CurrentUser | null>(null);
const language = ref<Language>((localStorage.getItem('energy_lang') as Language) || 'zh');
const modules = ref<ModuleMenus[]>([]);
const activeModuleCode = ref('');
const activeRoutePath = ref('');
const sideCollapsed = ref(false);
const visitedTabs = ref<VisitedTab[]>([]);
const loading = ref(false);
const error = ref('');
const loginForm = reactive({ account: '', password: '' });
const api = computed(() => new ApiClient('/api', () => token.value));

const activeModule = computed(() => modules.value.find((module) => module.code === activeModuleCode.value) ?? null);
const activeMenus = computed(() => flattenMenus(activeModule.value?.menus ?? []));
const activeMenu = computed(() => activeMenus.value.find((menu) => menu.routePath === activeRoutePath.value) ?? activeMenus.value[0] ?? null);
const visibleTabs = computed(() => visitedTabs.value
  .map((tab) => {
    const module = modules.value.find((item) => item.code === tab.moduleCode);
    const menu = flattenMenus(module?.menus ?? []).find((item) => item.routePath === tab.routePath);
    return module && menu ? { ...tab, module, menu } : null;
  })
  .filter((tab): tab is VisitedTab & { module: ModuleMenus; menu: MenuNode } => Boolean(tab)));
const shellContext = computed(() => ({
  apiBase: '/api',
  token: token.value,
  routePath: activeRoutePath.value,
  language: language.value
}));
const menuIconMap: Record<string, Component> = {
  Activity,
  BadgeDollarSign,
  BookOpen,
  Boxes,
  Building2,
  Clock3,
  Cpu,
  Factory,
  Gauge,
  GitBranch,
  KeyRound,
  Leaf,
  Menu,
  MenuSquare: SquareMenu,
  Network,
  RadioTower,
  Scale,
  ShieldCheck,
  UserCog,
  Users,
  UsersRound
};

function flattenMenus(menus: MenuNode[]): MenuNode[] {
  return menus.flatMap((menu) => [menu, ...flattenMenus(menu.children ?? [])]).filter((menu) => Boolean(menu.routePath));
}

function menuIcon(icon?: string): Component {
  return icon ? (menuIconMap[icon] ?? Menu) : Menu;
}

async function login() {
  loading.value = true;
  error.value = '';
  try {
    const result = await api.value.post<LoginResponse>('/basic/auth/login', loginForm);
    token.value = result.token;
    user.value = result.user;
    localStorage.setItem('energy_token', result.token);
    await loadMenus();
  } catch (err) {
    error.value = err instanceof Error ? err.message : String(err);
  } finally {
    loading.value = false;
  }
}

async function loadMenus() {
  if (!token.value) {
    return;
  }
  loading.value = true;
  error.value = '';
  try {
    modules.value = await api.value.get<ModuleMenus[]>('/basic/me/menus');
    if (!activeModuleCode.value) {
      const preferred = modules.value.find((module) => module.code === 'platform' || module.code === 'basic') ?? modules.value[0];
      selectModule(preferred?.code ?? '');
    }
    if (!user.value) {
      user.value = await api.value.get<CurrentUser>('/basic/me');
    }
  } catch (err) {
    error.value = err instanceof Error ? err.message : String(err);
    if (String(error.value).includes('Invalid token')) {
      logout();
    }
  } finally {
    loading.value = false;
  }
}

function selectModule(code: string) {
  activeModuleCode.value = code;
  const nextModule = modules.value.find((module) => module.code === code);
  const firstMenu = flattenMenus(nextModule?.menus ?? [])[0];
  activeRoutePath.value = firstMenu?.routePath ?? '';
  rememberTab(code, activeRoutePath.value);
}

function selectMenu(routePath?: string) {
  if (routePath) {
    activeRoutePath.value = routePath;
    rememberTab(activeModuleCode.value, routePath);
  }
}

function rememberTab(moduleCode: string, routePath?: string) {
  if (!moduleCode || !routePath) {
    return;
  }
  const exists = visitedTabs.value.some((tab) => tab.moduleCode === moduleCode && tab.routePath === routePath);
  if (!exists) {
    visitedTabs.value = [...visitedTabs.value, { moduleCode, routePath }].slice(-10);
  }
}

function openVisitedTab(tab: VisitedTab) {
  activeModuleCode.value = tab.moduleCode;
  activeRoutePath.value = tab.routePath;
  rememberTab(tab.moduleCode, tab.routePath);
}

function closeVisitedTab(tab: VisitedTab, event: MouseEvent) {
  event.stopPropagation();
  const index = visitedTabs.value.findIndex((item) => item.moduleCode === tab.moduleCode && item.routePath === tab.routePath);
  if (index < 0 || visitedTabs.value.length <= 1) {
    return;
  }
  const isActive = tab.moduleCode === activeModuleCode.value && tab.routePath === activeRoutePath.value;
  const nextTabs = visitedTabs.value.filter((_, itemIndex) => itemIndex !== index);
  visitedTabs.value = nextTabs;
  if (isActive) {
    const next = nextTabs[Math.max(0, index - 1)] ?? nextTabs[0];
    openVisitedTab(next);
  }
}

function setLanguage(event: Event) {
  language.value = (event.target as HTMLSelectElement).value as Language;
  localStorage.setItem('energy_lang', language.value);
}

function logout() {
  token.value = '';
  user.value = null;
  modules.value = [];
  activeModuleCode.value = '';
  activeRoutePath.value = '';
  visitedTabs.value = [];
  localStorage.removeItem('energy_token');
}

onMounted(loadMenus);
</script>

<template>
  <main v-if="!token" class="login-shell">
    <section class="login-panel">
      <div class="brand-mark">
        <Leaf :size="24" />
      </div>
      <h1>Energy Platform</h1>
      <form class="login-form" @submit.prevent="login">
        <label>
          <span>{{ language === 'zh' ? '账号' : 'Account' }}</span>
          <input v-model="loginForm.account" class="ep-input" autocomplete="username" />
        </label>
        <label>
          <span>{{ language === 'zh' ? '密码' : 'Password' }}</span>
          <input v-model="loginForm.password" class="ep-input" type="password" autocomplete="current-password" />
        </label>
        <p v-if="error" class="login-error">{{ error }}</p>
        <button class="ep-button primary login-submit" :disabled="loading">
          <CheckCircle2 :size="17" />
          {{ language === 'zh' ? '登录' : 'Sign in' }}
        </button>
      </form>
    </section>
  </main>

  <main v-else class="portal-app">
    <header class="topbar">
      <div class="portal-brand">
        <span class="brand-mark small"><Leaf :size="18" /></span>
        <span>{{ language === 'zh' ? '能源数据平台' : 'Energy Platform' }}</span>
      </div>
      <nav class="topnav" aria-label="modules">
        <button
          v-for="module in modules"
          :key="module.code"
          :class="{ active: module.code === activeModuleCode }"
          @click="selectModule(module.code)"
        >
          <Building2 v-if="module.code === 'platform'" :size="16" />
          <ShieldCheck v-else-if="module.code === 'basic'" :size="16" />
          <Menu v-else :size="16" />
          <span>{{ pickLabel(language, module.nameZh, module.nameEn) }}</span>
        </button>
      </nav>
      <div class="top-tools">
        <button class="icon-btn" :title="language === 'zh' ? '刷新菜单' : 'Refresh menus'" @click="loadMenus">
          <RefreshCw :size="16" />
        </button>
        <select class="lang-select" :value="language" @change="setLanguage">
          <option value="zh">简体中文</option>
          <option value="en">English</option>
        </select>
        <span class="user-text">{{ user?.username }}</span>
        <span class="avatar">{{ user?.username?.slice(0, 1) }}</span>
        <button class="icon-btn" :title="language === 'zh' ? '退出' : 'Sign out'" @click="logout">
          <LogOut :size="16" />
        </button>
      </div>
    </header>

    <div :class="['portal-shell', { 'side-collapsed': sideCollapsed }]">
      <aside class="portal-sidebar">
        <div class="side-title">{{ language === 'zh' ? '菜单' : 'Menu' }}</div>
        <nav class="side" aria-label="menus">
          <button
            v-for="menu in activeMenus"
            :key="menu.id"
            :class="['side-menu-item', { active: menu.routePath === activeRoutePath }]"
            @click="selectMenu(menu.routePath)"
          >
            <span class="menu-label">
              <span class="menu-icon">
                <component :is="menuIcon(menu.icon)" :size="17" />
              </span>
              <span>{{ pickLabel(language, menu.nameZh, menu.nameEn) }}</span>
            </span>
          </button>
        </nav>
        <div v-if="!activeMenus.length" class="side-empty">{{ language === 'zh' ? '暂无菜单' : 'No menus' }}</div>
        <button
          class="side-collapse-handle"
          :title="sideCollapsed ? (language === 'zh' ? '展开左侧菜单' : 'Expand side menu') : (language === 'zh' ? '收起左侧菜单' : 'Collapse side menu')"
          @click="sideCollapsed = !sideCollapsed"
        >
          <ChevronRight v-if="sideCollapsed" :size="15" />
          <ChevronLeft v-else :size="15" />
        </button>
      </aside>

      <section class="workspace">
        <div class="visited-tabs" aria-label="visited pages">
          <div
            v-for="tab in visibleTabs"
            :key="`${tab.moduleCode}-${tab.routePath}`"
            :class="['visited-tab', { active: tab.moduleCode === activeModuleCode && tab.routePath === activeRoutePath }]"
          >
            <button type="button" class="tab-main" @click="openVisitedTab(tab)">
              <span>{{ pickLabel(language, tab.menu.nameZh, tab.menu.nameEn) }}</span>
            </button>
            <button
              v-if="visibleTabs.length > 1"
              type="button"
              class="tab-close"
              :title="language === 'zh' ? '关闭标签' : 'Close tab'"
              @click="closeVisitedTab(tab, $event)"
            >
              <X :size="13" />
            </button>
          </div>
        </div>
        <div v-if="error" class="shell-alert">{{ error }}</div>
        <MicroAppHost
          v-if="activeModuleCode"
          :key="`${activeModuleCode}-${activeRoutePath}-${language}`"
          :code="activeModuleCode"
          :context="shellContext"
        />
      </section>
    </div>
  </main>
</template>
