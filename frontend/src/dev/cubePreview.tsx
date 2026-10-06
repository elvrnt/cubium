import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ScramblePreview } from './ScramblePreview';
import '../app/styles.css';

const root = document.getElementById('root');
if (!root) throw new Error('Root element is missing');
createRoot(root).render(
  <StrictMode>
    <ScramblePreview />
  </StrictMode>,
);
