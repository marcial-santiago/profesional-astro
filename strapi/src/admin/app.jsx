import authLogo from './extensions/roldans-auth-logo.svg';
import menuLogo from './extensions/roldans-menu-logo.svg';
import favicon from './extensions/roldans-favicon.svg';

const roldansLightTheme = {
  colors: {
    buttonPrimary500: '#0ea5e9',
    buttonPrimary600: '#0284c7',
    primary100: '#e0f2fe',
    primary200: '#bae6fd',
    primary500: '#0ea5e9',
    primary600: '#0284c7',
    primary700: '#0369a1',
    secondary100: '#f0f9ff',
    secondary200: '#bae6fd',
    secondary500: '#38bdf8',
    secondary600: '#0284c7',
    secondary700: '#075985',
    alternative100: '#f1f5f9',
    alternative200: '#cbd5e1',
    alternative500: '#64748b',
    alternative600: '#475569',
    alternative700: '#334155',
    neutral100: '#f8fafc',
    neutral150: '#e2e8f0',
    neutral200: '#cbd5e1',
    neutral600: '#475569',
    neutral700: '#334155',
    neutral800: '#1e293b',
    neutral900: '#0f172a',
    neutral1000: '#020617',
  },
  shadows: {
    filterShadow: '0 10px 30px rgba(15, 23, 42, 0.08)',
    focus: 'inset 2px 0 0 #0284c7, inset 0 2px 0 #0284c7, inset -2px 0 0 #0284c7, inset 0 -2px 0 #0284c7',
    focusShadow: '0 0 0 3px rgba(14, 165, 233, 0.25)',
    popupShadow: '0 20px 45px rgba(15, 23, 42, 0.14)',
    tableShadow: '0 10px 30px rgba(15, 23, 42, 0.08)',
  },
};

const roldansDarkTheme = {
  colors: {
    buttonPrimary500: '#38bdf8',
    buttonPrimary600: '#0ea5e9',
    primary100: '#0f172a',
    primary200: '#1e293b',
    primary500: '#38bdf8',
    primary600: '#0ea5e9',
    primary700: '#7dd3fc',
    secondary100: '#0f172a',
    secondary200: '#1e293b',
    secondary500: '#38bdf8',
    secondary600: '#38bdf8',
    secondary700: '#bae6fd',
    alternative100: '#111827',
    alternative200: '#334155',
    alternative500: '#94a3b8',
    alternative600: '#cbd5e1',
    alternative700: '#e2e8f0',
    neutral0: '#0f172a',
    neutral100: '#020617',
    neutral150: '#1e293b',
    neutral200: '#334155',
    neutral600: '#cbd5e1',
    neutral700: '#e2e8f0',
    neutral800: '#f8fafc',
    neutral900: '#ffffff',
    neutral1000: '#ffffff',
  },
  shadows: {
    filterShadow: '0 10px 30px rgba(2, 6, 23, 0.55)',
    focus: 'inset 2px 0 0 #38bdf8, inset 0 2px 0 #38bdf8, inset -2px 0 0 #38bdf8, inset 0 -2px 0 #38bdf8',
    focusShadow: '0 0 0 3px rgba(56, 189, 248, 0.3)',
    popupShadow: '0 20px 45px rgba(2, 6, 23, 0.55)',
    tableShadow: '0 10px 30px rgba(2, 6, 23, 0.45)',
  },
};

function applyBrowserBranding() {
  document.title = 'Roldans Admin';

  const existingIcon = document.querySelector("link[rel='icon']");
  const icon = existingIcon || document.createElement('link');
  icon.setAttribute('rel', 'icon');
  icon.setAttribute('type', 'image/svg+xml');
  icon.setAttribute('href', favicon);

  if (!existingIcon) {
    document.head.appendChild(icon);
  }
}

export default {
  config: {
    auth: {
      logo: authLogo,
    },
    menu: {
      logo: menuLogo,
    },
    locales: ['es', 'en'],
    notifications: {
      releases: false,
    },
    tutorials: false,
    theme: {
      light: roldansLightTheme,
      dark: roldansDarkTheme,
    },
    translations: {
      en: {
        'Auth.form.welcome.title': 'Welcome to Roldans Admin',
        'Auth.form.welcome.subtitle': 'Manage services, bookings and website content',
        'global.marketplace': 'Marketplace',
      },
      es: {
        'Auth.form.welcome.title': 'Bienvenido a Roldans Admin',
        'Auth.form.welcome.subtitle': 'Gestioná servicios, reservas y contenido del sitio',
      },
    },
  },
  bootstrap() {
    applyBrowserBranding();
  },
};
