<script setup lang="ts">
import {
  Building2,
  CheckCircle2,
  ChevronRight,
  Languages,
  Leaf,
  LogOut,
  Menu,
  RefreshCw,
  Search,
  ShieldCheck,
  UserCircle2
} from 'lucide-vue-next';
import { computed, onMounted, reactive, ref } from 'vue';
import { ApiClient, pickLabel, type CurrentUser, type Language, type MenuNode, type ModuleMenus } from '@energy-platform/shared';
import MicroAppHost from './components/MicroAppHost.vue';

interface LoginResponse {
  token: string;
  user: CurrentUser;
}

const token = ref(localStorage.getItem('energy_token') ?? '');
const user = ref<CurrentUser | null>(null);
const language = ref<Language>((localStorage.getItem('energy_lang') as Language) || 'zh');
const modules = ref<ModuleMenus[]>([]);
const activeModuleCode = ref('');
const activeRoutePath = ref('');
const loading = ref(false);
const error = ref('');
const loginForm = reactive({ account: 'admin', password: 'admin123' });
const api = computed(() => new ApiClient('/api', () => token.value));

const activeModule = computed(() => modules.value.find((module) => module.code === activeModuleCode.value) ?? null);
const activeMenus = computed(() => flattenMenus(activeModule.value?.menus ?? []));
const activeMenu = computed(() => activeMenus.value.find((menu) => menu.routePath === activeRoutePath.value) ?? activeMenus.value[0] ?? null);
const shellContext = computed(() => ({
  apiBase: '/api',
  token: token.value,
  routePath: activeRoutePath.value,
  language: language.value
}));

function flattenMenus(menus: MenuNode[]): MenuNode[] {
  return menus.flatMap((menu) => [menu, ...flattenMenus(menu.children ?? [])]).filter((menu) => Boolean(menu.routePath));
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
}

function selectMenu(routePath?: string) {
  if (routePath) {
    activeRoutePath.value = routePath;
  }
}

function toggleLanguage() {
  language.value = language.value === 'zh' ? 'en' : 'zh';
  localStorage.setItem('energy_lang', language.value);
}

function logout() {
  token.value = '';
  user.value = null;
  modules.value = [];
  activeModuleCode.value = '';
  activeRoutePath.value = '';
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

  <main v-else class="portal-shell">
    <aside class="portal-sidebar">
      <div class="portal-brand">
        <span class="brand-mark small"><Leaf :size="18" /></span>
        <div>
          <strong>Energy Platform</strong>
          <small>{{ language === 'zh' ? '微前端工作台' : 'Micro Frontend Console' }}</small>
        </div>
      </div>
      <nav class="module-tabs" aria-label="modules">
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
      <div class="side-section">
        <div class="side-section__title">{{ language === 'zh' ? '菜单' : 'Menu' }}</div>
        <button
          v-for="menu in activeMenus"
          :key="menu.id"
          :class="['side-menu-item', { active: menu.routePath === activeRoutePath }]"
          @click="selectMenu(menu.routePath)"
        >
          <ChevronRight :size="15" />
          <span>{{ pickLabel(language, menu.nameZh, menu.nameEn) }}</span>
        </button>
        <div v-if="!activeMenus.length" class="side-empty">{{ language === 'zh' ? '暂无菜单' : 'No menus' }}</div>
      </div>
    </aside>

    <section class="portal-main">
      <header class="portal-header">
        <div class="breadcrumb">
          <span>{{ activeModule ? pickLabel(language, activeModule.nameZh, activeModule.nameEn) : '-' }}</span>
          <ChevronRight :size="15" />
          <strong>{{ activeMenu ? pickLabel(language, activeMenu.nameZh, activeMenu.nameEn) : '-' }}</strong>
        </div>
        <div class="header-actions">
          <div class="search-box">
            <Search :size="16" />
            <span>{{ language === 'zh' ? '全局搜索' : 'Global search' }}</span>
          </div>
          <button class="ep-button icon" :title="language === 'zh' ? '刷新菜单' : 'Refresh menus'" @click="loadMenus">
            <RefreshCw :size="16" />
          </button>
          <button class="ep-button icon" :title="language === 'zh' ? '语言' : 'Language'" @click="toggleLanguage">
            <Languages :size="16" />
          </button>
          <div class="user-chip">
            <UserCircle2 :size="17" />
            <span>{{ user?.username }}</span>
          </div>
          <button class="ep-button icon" :title="language === 'zh' ? '退出' : 'Sign out'" @click="logout">
            <LogOut :size="16" />
          </button>
        </div>
      </header>
      <div v-if="error" class="shell-alert">{{ error }}</div>
      <MicroAppHost
        v-if="activeModuleCode"
        :key="`${activeModuleCode}-${activeRoutePath}-${language}`"
        :code="activeModuleCode"
        :context="shellContext"
      />
    </section>
  </main>
</template>
