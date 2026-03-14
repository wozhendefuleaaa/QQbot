import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './globals.css';
import './styles.css';
import { QueryProvider } from './lib/query-provider';
import { ThemeProvider } from './hooks/useTheme';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryProvider>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </QueryProvider>
  </React.StrictMode>
);
