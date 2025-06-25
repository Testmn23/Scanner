import { createApp, h, reactive, defineComponent } from 'vue';
import { i18n } from './utils/i18n'; // i18n instance
import App from './App.vue';
import CustomMessagePage from './components/gate/CustomMessagePage.vue';
import MaintenancePage from './components/gate/MaintenancePage.vue';
import PasswordPromptPage from './components/gate/PasswordPromptPage.vue';
import './index.css';
import './style.css';

import { registerSW } from 'virtual:pwa-register';

const VITE_APP_PASSWORD = import.meta.env.VITE_APP_PASSWORD;

const defaultConfig = {
  isMaintenanceModeEnabled: false,
  maintenanceMessage: '<h1>Site Under Maintenance Default</h1><p>We are currently performing scheduled maintenance. We should be back online shortly.</p>',
  isPasswordProtectionEnabled: false,
  isCustomMessageModeEnabled: false,
  customMessage: '<h1>Welcome Default!</h1><p>This page is intentionally blank.</p>',
};

const appState = reactive({
  currentView: 'loading', // loading, custom, password, maintenance, app
  config: { ...defaultConfig },
  isAuthenticated: false, // Used to track password success specifically
});

const RootComponent = defineComponent({
  setup() {
    // Initial config load
    async function fetchConfigAndInitializeView() {
      try {
        const response = await fetch('/config.json');
        if (response.ok) {
          const loadedConfig = await response.json();
          appState.config = { ...defaultConfig, ...loadedConfig };
        } else {
          console.warn('config.json not found or failed to load, using default configuration.');
          appState.config = { ...defaultConfig }; // Ensure it's set
        }
      } catch (error) {
        console.error('Error fetching or parsing config.json, using default configuration:', error);
        appState.config = { ...defaultConfig }; // Ensure it's set
      }
      determineInitialView();
    }

    function determineInitialView() {
      if (appState.config.isCustomMessageModeEnabled) {
        appState.currentView = 'custom';
      } else if (appState.config.isPasswordProtectionEnabled && !appState.isAuthenticated) {
        // Only go to password view if not already authenticated in this session/flow
        appState.currentView = 'password';
      } else if (appState.config.isMaintenanceModeEnabled) {
        appState.currentView = 'maintenance';
      } else {
        appState.currentView = 'app';
      }
    }

    function handlePasswordSuccess(nextViewType: 'app' | 'maintenance') {
      appState.isAuthenticated = true; // Mark as authenticated
      if (nextViewType === 'maintenance') {
         // This logic is already in PasswordPromptPage based on its config prop.
         // PasswordPromptPage emits 'maintenance' or 'app'.
        appState.currentView = 'maintenance';
      } else {
        appState.currentView = 'app';
      }
    }

    fetchConfigAndInitializeView();

    return () => {
      let componentToRender;
      let props: Record<string, any> = {};

      switch (appState.currentView) {
        case 'custom':
          componentToRender = CustomMessagePage;
          props = { message: appState.config.customMessage };
          break;
        case 'password':
          componentToRender = PasswordPromptPage;
          props = {
            correctPassword: VITE_APP_PASSWORD,
            config: appState.config,
            onAuthComplete: handlePasswordSuccess, // Event name is authComplete
          };
          break;
        case 'maintenance':
          componentToRender = MaintenancePage;
          props = { message: appState.config.maintenanceMessage };
          break;
        case 'app':
          componentToRender = App;
          // Props for App.vue if any (currently none)
          break;
        default: // loading or error
          componentToRender = { render: () => h('div', { class: 'gate-page-container' }, [h('div',{ class: 'gate-content-wrapper'}, 'Loading...')]) };
      }
      return h(componentToRender, props);
    };
  }
});

// Create the main Vue application instance with the RootComponent
const app = createApp(RootComponent);

// Use i18n globally. This ensures that if App.vue is rendered, it has access to i18n.
// Other gate components can also use i18n if needed, by injecting it.
app.use(i18n);

// Mount the app
app.mount('#app');

// Register PWA service worker
registerSW({ immediate: true });
