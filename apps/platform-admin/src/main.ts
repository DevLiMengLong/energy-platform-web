import { mount } from './micro';

mount(document.getElementById('app')!, {
  apiBase: '/api',
  token: localStorage.getItem('energy_token') ?? '',
  routePath: '/platform/tenants',
  language: 'zh'
});
