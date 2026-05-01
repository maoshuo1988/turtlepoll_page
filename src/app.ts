import React from 'react';
import { App as AntdApp, ConfigProvider, theme as antdTheme } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { QueryClientProvider } from 'react-query';
import { queryClient } from './queryClient';
import './index.css';

export function rootContainer(container: React.ReactNode) {
  return React.createElement(
    ConfigProvider,
    {
      locale: zhCN,
      theme: {
        algorithm: antdTheme.darkAlgorithm,
        token: {
          borderRadius: 8,
          colorPrimary: '#22c55e',
          fontFamily: "'Noto Sans SC', 'PingFang SC', 'Hiragino Sans GB', sans-serif",
        },
      },
    },
    React.createElement(
      AntdApp,
      null,
      React.createElement(QueryClientProvider, { client: queryClient }, container),
    ),
  );
}
