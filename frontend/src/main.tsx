import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter } from 'react-router';
import { createAppRoutes } from './app/router';
import { App } from './app/App';
import { createTimerApplication } from './app/createTimerApplication';
import './app/styles.css';

const root = document.getElementById('root');

if (!root) {
  throw new Error('Root element is missing');
}

const runtime = createTimerApplication();
const router = createBrowserRouter(createAppRoutes(runtime));
const reactRoot = createRoot(root);
reactRoot.render(
  <StrictMode>
    <App
      application={runtime.application}
      clock={runtime.clock}
      router={router}
    />
  </StrictMode>,
);

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    reactRoot.unmount();
    router.dispose();
    runtime.close();
  });
}
