/**
 * 文件说明：项目全局类型声明，补充静态资源和运行时类型。
 */
declare module '*.css';
declare module '*.scss';
declare module '*.module.scss' {
  const classes: Record<string, string>;
  export default classes;
}

declare const process: {
  env: {
    NODE_ENV?: 'development' | 'production' | 'test';
    UMI_ENV?: string;
    UMI_APP_SERVER_API?: string;
    TURTLE_API_ORIGIN?: string;
  };
};
