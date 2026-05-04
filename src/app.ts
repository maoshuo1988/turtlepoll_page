/**
 * 文件说明：Umi 运行时入口，挂载全局 Provider、主题配置和浏览器标签页品牌信息。
 */
import React from 'react';
import { App as AntdApp, ConfigProvider, theme as antdTheme } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import { QueryClientProvider } from 'react-query';
import { queryClient } from './queryClient';
import './index.css';

function ensureBrowserTabBranding() {
  if (typeof document === 'undefined') return;

  document.title = '龟投';

  const existingIcon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  const iconLink = existingIcon ?? document.createElement('link');
  iconLink.rel = 'icon';
  iconLink.type = 'image/png';
  iconLink.href = '/logo.png';

  if (!existingIcon) {
    document.head.appendChild(iconLink);
  }

  const existingAppleIcon = document.querySelector<HTMLLinkElement>('link[rel="apple-touch-icon"]');
  const appleIconLink = existingAppleIcon ?? document.createElement('link');
  appleIconLink.rel = 'apple-touch-icon';
  appleIconLink.href = '/logo.png';

  if (!existingAppleIcon) {
    document.head.appendChild(appleIconLink);
  }
}

export function rootContainer(container: React.ReactNode) {
  ensureBrowserTabBranding();

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
