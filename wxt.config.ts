import { defineConfig } from 'wxt';

export default defineConfig({
  srcDir: 'src',
  modules: ['@wxt-dev/module-react'],
  manifest: {
    name: 'Last Sign-in',
    description:
      'See which sign-in method you used last time. Stored on your device, without passwords, emails, cookies, or tokens.',
    permissions: ['storage', 'activeTab', 'scripting'],
    optional_host_permissions: ['http://*/*', 'https://*/*'],
    action: {
      default_title: 'Last Sign-in',
      default_icon: {
        '16': 'icon/16.png',
        '32': 'icon/32.png',
        '48': 'icon/48.png',
        '96': 'icon/96.png',
        '128': 'icon/128.png',
      },
    },
    options_ui: {
      open_in_tab: true,
    },
  },
  hooks: {
    'build:manifestGenerated': (_wxt, manifest) => {
      if (manifest.options_ui) {
        manifest.options_ui.open_in_tab = true;
      }
    },
  },
});
