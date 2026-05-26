<script setup lang="ts">
import { nextTick, onBeforeUnmount, ref, watch } from 'vue';
import type { MicroAppContext, MicroAppHandle, MountMicroApp } from '@energy-platform/shared';

const props = defineProps<{
  code: string;
  context: MicroAppContext;
}>();

const host = ref<HTMLElement | null>(null);
const error = ref('');
let handle: MicroAppHandle | null = null;

async function loadMount(code: string): Promise<MountMicroApp | null> {
  if (code === 'platform') {
    if (import.meta.env.DEV) {
      return (await import('@energy-platform/platform-admin/micro')).mount;
    }
    const entry = '/platform-admin/assets/entry.js';
    return (await import(/* @vite-ignore */ entry)).mount;
  }
  if (code === 'basic') {
    if (import.meta.env.DEV) {
      return (await import('@energy-platform/basic-info/micro')).mount;
    }
    const entry = '/basic-info/assets/entry.js';
    return (await import(/* @vite-ignore */ entry)).mount;
  }
  return null;
}

async function mountApp() {
  error.value = '';
  handle?.unmount();
  handle = null;
  await nextTick();
  if (!host.value) {
    return;
  }
  host.value.innerHTML = '';
  try {
    const mount = await loadMount(props.code);
    if (!mount) {
      error.value = props.context.language === 'zh' ? '子系统暂未接入' : 'Subsystem is not connected';
      return;
    }
    handle = mount(host.value, props.context);
  } catch (err) {
    error.value = err instanceof Error ? err.message : String(err);
  }
}

watch(() => [props.code, props.context.routePath, props.context.token, props.context.language], mountApp, {
  immediate: true
});

onBeforeUnmount(() => handle?.unmount());
</script>

<template>
  <div class="micro-host">
    <div v-if="error" class="ep-empty">{{ error }}</div>
    <div ref="host" class="micro-host__mount"></div>
  </div>
</template>
