import { onBeforeUnmount, ref, watch, type ComputedRef, type CSSProperties } from 'vue';
import type { ColumnConfig } from './types';

const MIN_COLUMN_WIDTH = 72;
const MAX_COLUMN_WIDTH = 720;

interface ResizableTableColumnsOptions {
  columns: ComputedRef<ColumnConfig[]>;
  storageKey: ComputedRef<string>;
}

interface ResizeState {
  key: string;
  startX: number;
  startWidth: number;
  minWidth: number;
}

function parsePx(value?: string): number | null {
  if (!value || !value.endsWith('px')) {
    return null;
  }
  const parsed = Number(value.replace('px', ''));
  return Number.isFinite(parsed) ? parsed : null;
}

function clampWidth(value: number, minWidth: number): number {
  return Math.min(Math.max(Math.round(value), minWidth), MAX_COLUMN_WIDTH);
}

function fallbackMinWidth(column: ColumnConfig): number {
  if (column.type === 'actions') {
    return 118;
  }
  if (column.type === 'datetime') {
    return 150;
  }
  if (column.type === 'status' || column.type === 'visibility') {
    return 92;
  }
  if (column.type === 'number') {
    return 76;
  }
  if (column.tree) {
    return 180;
  }
  return Math.max(MIN_COLUMN_WIDTH, Math.min(column.labelZh.length * 16 + 48, 180));
}

function readStoredWidths(storageKey: string): Record<string, number> {
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return Object.entries(parsed).reduce<Record<string, number>>((result, [key, value]) => {
      const width = Number(value);
      if (Number.isFinite(width)) {
        result[key] = width;
      }
      return result;
    }, {});
  } catch {
    return {};
  }
}

export function useResizableTableColumns(options: ResizableTableColumnsOptions) {
  const manualWidths = ref<Record<string, number>>({});
  const resizing = ref<ResizeState | null>(null);

  function columnMinWidth(column: ColumnConfig): number {
    return Math.max(parsePx(column.width) ?? 0, fallbackMinWidth(column));
  }

  function columnStyle(column: ColumnConfig): CSSProperties {
    const minWidth = columnMinWidth(column);
    const manualWidth = manualWidths.value[column.key];
    const configuredWidth = parsePx(column.width);
    const width = manualWidth ?? configuredWidth;
    if (!width) {
      return { minWidth: `${minWidth}px` };
    }
    return {
      width: `${clampWidth(width, minWidth)}px`,
      minWidth: `${minWidth}px`
    };
  }

  function persistWidths() {
    try {
      const widths = Object.fromEntries(
        Object.entries(manualWidths.value).filter(([, value]) => Number.isFinite(value))
      );
      if (Object.keys(widths).length) {
        window.localStorage.setItem(options.storageKey.value, JSON.stringify(widths));
      } else {
        window.localStorage.removeItem(options.storageKey.value);
      }
    } catch {
      // Width persistence is an enhancement; dragging must still work if storage is unavailable.
    }
  }

  function loadWidths() {
    const knownKeys = new Set(options.columns.value.map((column) => column.key));
    const stored = readStoredWidths(options.storageKey.value);
    manualWidths.value = Object.entries(stored).reduce<Record<string, number>>((result, [key, value]) => {
      if (knownKeys.has(key)) {
        result[key] = value;
      }
      return result;
    }, {});
  }

  function stopResize() {
    if (!resizing.value) {
      return;
    }
    resizing.value = null;
    document.body.classList.remove('ep-column-resizing');
    window.removeEventListener('pointermove', handlePointerMove);
    window.removeEventListener('pointerup', stopResize);
    persistWidths();
  }

  function handlePointerMove(event: PointerEvent) {
    const state = resizing.value;
    if (!state) {
      return;
    }
    manualWidths.value = {
      ...manualWidths.value,
      [state.key]: clampWidth(state.startWidth + event.clientX - state.startX, state.minWidth)
    };
  }

  function startColumnResize(event: PointerEvent, column: ColumnConfig) {
    if (event.button !== 0) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const th = (event.currentTarget as HTMLElement).closest('th');
    const minWidth = columnMinWidth(column);
    const currentWidth = th?.getBoundingClientRect().width ?? manualWidths.value[column.key] ?? parsePx(column.width) ?? minWidth;
    resizing.value = {
      key: column.key,
      startX: event.clientX,
      startWidth: currentWidth,
      minWidth
    };
    document.body.classList.add('ep-column-resizing');
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', stopResize);
  }

  function resetColumnWidth(column: ColumnConfig) {
    if (!(column.key in manualWidths.value)) {
      return;
    }
    const next = { ...manualWidths.value };
    delete next[column.key];
    manualWidths.value = next;
    persistWidths();
  }

  watch([options.storageKey, () => options.columns.value.map((column) => column.key).join('|')], loadWidths, { immediate: true });
  onBeforeUnmount(stopResize);

  return {
    columnStyle,
    resetColumnWidth,
    startColumnResize
  };
}
