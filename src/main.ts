import './styles/main.scss';
import './components';
import { registerSW } from 'virtual:pwa-register';
import { App } from './app/app';
import { injectIcons } from './app/icons';
import { t } from './app/i18n';
import { toast } from './app/ui';

injectIcons();
const app = new App();

registerSW({
  immediate: true,
  onOfflineReady: () => toast(t('offline')),
  onNeedRefresh: () => toast(t('updated')),
});

// Accès en console pour expérimenter : window.timeCircuits.dest.update({ year: '2015' })
(window as unknown as { timeCircuits: App }).timeCircuits = app;
