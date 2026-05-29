<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref } from 'vue';
import { ChevronDown } from 'lucide-vue-next';

type SelectValue = string | number | boolean;
type SelectModelValue = SelectValue | SelectValue[];

const props = withDefaults(defineProps<{
  modelValue: SelectModelValue;
  options: Array<{ label: string; value: SelectValue }>;
  disabled?: boolean;
  multiple?: boolean;
  placeholder?: string;
}>(), {
  disabled: false,
  multiple: false,
  placeholder: ''
});

const emit = defineEmits<{
  'update:modelValue': [value: SelectModelValue];
  change: [value: SelectModelValue];
}>();

const root = ref<HTMLElement | null>(null);
const open = ref(false);
const menuPlacement = ref<'bottom' | 'top'>('bottom');
const searchText = ref('');
const selectedValues = computed(() => Array.isArray(props.modelValue) ? props.modelValue : [props.modelValue]);
const selectedOptions = computed(() => props.options.filter((option) => selectedValues.value.includes(option.value)));
const filteredOptions = computed(() => {
  const keyword = searchText.value.trim().toLowerCase();
  if (!keyword) {
    return props.options;
  }
  return props.options.filter((option) => `${option.label} ${String(option.value)}`.toLowerCase().includes(keyword));
});
const selectedText = computed(() => {
  if (!selectedOptions.value.length) {
    return props.placeholder;
  }
  return selectedOptions.value.map((option) => option.label).join('、');
});

function outsideListener(event: PointerEvent) {
  if (!root.value?.contains(event.target as Node)) {
    open.value = false;
  }
}

function refreshPlacement() {
  const rect = root.value?.getBoundingClientRect();
  if (!rect) {
    return;
  }
  const bottomSpace = window.innerHeight - rect.bottom;
  menuPlacement.value = bottomSpace < 220 && rect.top > bottomSpace ? 'top' : 'bottom';
}

async function toggleOpen() {
  if (props.disabled) {
    return;
  }
  open.value = !open.value;
  if (open.value) {
    searchText.value = '';
    await nextTick();
    refreshPlacement();
    window.addEventListener('pointerdown', outsideListener);
    window.addEventListener('resize', refreshPlacement);
    window.addEventListener('scroll', refreshPlacement, true);
  } else {
    removeListeners();
  }
}

function choose(value: SelectValue) {
  if (props.multiple) {
    const nextValues = selectedValues.value.includes(value)
      ? selectedValues.value.filter((item) => item !== value)
      : [...selectedValues.value.filter((item) => item !== ''), value];
    emit('update:modelValue', nextValues);
    emit('change', nextValues);
    return;
  }
  emit('update:modelValue', value);
  emit('change', value);
  open.value = false;
  removeListeners();
}

function isSelected(value: SelectValue) {
  return selectedValues.value.includes(value);
}

function removeListeners() {
  window.removeEventListener('pointerdown', outsideListener);
  window.removeEventListener('resize', refreshPlacement);
  window.removeEventListener('scroll', refreshPlacement, true);
}

onBeforeUnmount(removeListeners);
</script>

<template>
  <div ref="root" :class="['ep-select-box', { open, disabled }]">
    <button type="button" class="ep-select-trigger" :disabled="disabled" @click="toggleOpen">
      <span>{{ selectedText }}</span>
      <ChevronDown :size="16" />
    </button>
    <div v-if="open" :class="['ep-select-menu', menuPlacement]" role="listbox">
      <div v-if="options.length > 6" class="ep-select-search-wrap">
        <input
          v-model="searchText"
          class="ep-select-search"
          :placeholder="placeholder || '搜索'"
          @click.stop
          @pointerdown.stop
        />
      </div>
      <button
        v-for="option in filteredOptions"
        :key="String(option.value)"
        type="button"
        :class="['ep-select-option', { active: isSelected(option.value) }]"
        role="option"
        :aria-selected="isSelected(option.value)"
        @click="choose(option.value)"
      >
        <span v-if="multiple" class="ep-select-check">{{ isSelected(option.value) ? '✓' : '' }}</span>
        {{ option.label }}
      </button>
      <div v-if="!filteredOptions.length" class="ep-select-empty">无匹配数据</div>
    </div>
  </div>
</template>
