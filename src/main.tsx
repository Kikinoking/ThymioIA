import * as React from 'react';
import { createRoot } from 'react-dom/client';
import App from './views/App/App';
import './views/global-styles/index.css';

const container = document.getElementById('root');
if (container) {
  createRoot(container).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
} else {
  console.error('Could not find root element to mount to!');
}
