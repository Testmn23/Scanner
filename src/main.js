import { createApp, h, reactive, defineComponent } from 'vue';
import { i18n } from './utils/i18n'; // i18n instance
import App from './App.vue';
import CustomMessagePage from './components/gate/CustomMessagePage.vue';
import MaintenancePage from './components/gate/MaintenancePage.vue';
import PasswordPromptPage from './components/gate/PasswordPromptPage.vue';
import PortalLoginPage from './views/portal/PortalLoginPage.vue';
import PortalSignupPage from './views/portal/PortalSignupPage.vue';
import PortalDashboardPage from './views/portal/PortalDashboardPage.vue';
import PortalProfilePage from './views/portal/PortalProfilePage.vue'; // Import the new page
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

// Make appState globally accessible for now for simplified navigation
// In a larger app, provide/inject or a proper state management (Pinia) would be better.
const globalAppState = reactive({
  currentView: 'loading', // loading, custom, password, maintenance, app, portal-login, portal-signup, portal-dashboard, portal-profile
  config: { ...defaultConfig },
  isGateAuthenticated: false, // For the initial password gate
  // Firebase auth state will be managed separately by a dedicated auth composable/store
});
// Assign to window in a way that's more JS-friendly for build tools,
// while still giving TS a hint if this file is processed by TS.
(window as Window & { globalAppState?: any }).globalAppState = globalAppState; // For easy access from placeholder components

const RootComponent = defineComponent({
  setup() {
    // Initial config load for gate modes
    async function fetchConfigAndInitializeView() {
      try {
        const response = await fetch('/config.json');
        if (response.ok) {
          const loadedConfig = await response.json();
          globalAppState.config = { ...defaultConfig, ...loadedConfig };
        } else {
          console.warn('config.json not found or failed to load, using default configuration.');
          globalAppState.config = { ...defaultConfig };
        }
      } catch (error) {
        console.error('Error fetching or parsing config.json, using default configuration:', error);
        globalAppState.config = { ...defaultConfig };
      }
      determineInitialGateView();
    }

    function determineInitialGateView() {
      // Check for portal views first based on URL hash, for example
      // This is a simple way to handle direct navigation for now.
      // A proper router would handle this more robustly.
      if (window.location.hash === '#/portal/login') {
        globalAppState.currentView = 'portal-login';
        return;
      } else if (window.location.hash === '#/portal/signup') {
        globalAppState.currentView = 'portal-signup';
        return;
      } else if (window.location.hash === '#/portal/dashboard') {
        // Later, this will be protected
        globalAppState.currentView = 'portal-dashboard';
        return;
      } else if (window.location.hash === '#/portal/profile') {
        // Later, this will also be protected
        globalAppState.currentView = 'portal-profile';
        return;
      }


      if (globalAppState.config.isCustomMessageModeEnabled) {
        globalAppState.currentView = 'custom';
      } else if (globalAppState.config.isPasswordProtectionEnabled && !globalAppState.isGateAuthenticated) {
        globalAppState.currentView = 'password';
      } else if (globalAppState.config.isMaintenanceModeEnabled) {
        globalAppState.currentView = 'maintenance';
      } else {
        // Default to main app if no gate modes are active and no portal hash matches
        globalAppState.currentView = 'app';
      }
    }

    function handlePasswordSuccess(nextViewType: 'app' | 'maintenance') {
      globalAppState.isGateAuthenticated = true;
      if (nextViewType === 'maintenance') {
        globalAppState.currentView = 'maintenance';
      } else {
        // After password gate, if no maintenance, show main app by default
        // Portal navigation will be handled by portal components changing globalAppState.currentView
        // or by future routing logic.
        globalAppState.currentView = 'app';
      }
    }

    fetchConfigAndInitializeView();

    // Listen to hash changes for simple navigation without a full router
    window.addEventListener('hashchange', determineInitialGateView);
    // Ensure onUnmounted cleans up this listener if RootComponent can be unmounted,
    // but for the root, it's usually not an issue.

    return () => {
      let componentToRender;
      let props: Record<string, any> = {};

      switch (globalAppState.currentView) {
        case 'custom':
          componentToRender = CustomMessagePage;
          props = { message: globalAppState.config.customMessage };
          break;
        case 'password':
          componentToRender = PasswordPromptPage;
          props = {
            correctPassword: VITE_APP_PASSWORD,
            config: globalAppState.config,
            onAuthComplete: handlePasswordSuccess,
          };
          break;
        case 'maintenance':
          componentToRender = MaintenancePage;
          props = { message: globalAppState.config.maintenanceMessage };
          break;
        case 'app':
          componentToRender = App;
          break;
        case 'portal-login':
          componentToRender = PortalLoginPage;
          break;
        case 'portal-signup':
          componentToRender = PortalSignupPage;
          break;
        case 'portal-dashboard':
          componentToRender = PortalDashboardPage;
          break;
        case 'portal-profile':
          componentToRender = PortalProfilePage;
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
