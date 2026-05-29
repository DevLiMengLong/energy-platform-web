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
