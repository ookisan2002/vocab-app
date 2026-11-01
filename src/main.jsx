import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ConfigProvider, theme, App as AntApp } from 'antd';
import './index.css';
import App from './App.jsx';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ConfigProvider
      theme={{
        algorithm: theme.darkAlgorithm,
        token: {
          colorPrimary: '#7c6af7',
          colorSuccess: '#2ed573',
          colorWarning: '#f5a623',
          colorError: '#ff4757',
          colorBgBase: '#0d0d17',
          colorBgContainer: '#16142a',
          colorBgElevated: '#1f1b3c',
          colorBorder: 'rgba(255, 255, 255, 0.12)',
          borderRadius: 12,
          fontFamily: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif",
        },
      }}
    >
      <AntApp>
        <App />
      </AntApp>
    </ConfigProvider>
  </StrictMode>,
);
