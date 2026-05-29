import { createApp } from 'vue';
import '@energy-platform/shared/styles.css';
import './workspace.css';
import App from './App.vue';

createApp(App, {
  context: {
    apiBase: '/api',
    token: localStorage.getItem('energy_token') ?? '',
    routePath: window.location.pathname.includes('/cleaning/details') ? '/cleaning/details' : '/cleaning/config',
    language: (localStorage.getItem('energy_lang') as 'zh' | 'en') || 'zh'
  }
}).mount('#app');
