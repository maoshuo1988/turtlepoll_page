# 斗龟场 v1.0 部署说明

## 包内容
- `turtle-v1.0.zip` (约 166 MB 解压后) — 静态网站完整产物
- 主入口: `index.html`
- 子目录: `assets/` (JS/CSS, 含 hash 文件名自动缓存失效) + `bgm-*.mp3` (背景乐) + 各类图片资源目录

## 部署到任意 Web 服务器 (Nginx / Apache / Tencent COS / Aliyun OSS / 自建 IIS / GitHub Pages 等)

### 最简部署
1. 解压 `turtle-v1.0.zip` 得到一堆文件 (其中包含 `index.html`)
2. 把解压后的**所有内容**(不要再嵌一层文件夹)拷到你的网站静态资源目录, 比如:
   - 根目录: `https://yoursite.com/` → 解压物直接放服务器根
   - 子目录: `https://yoursite.com/turtle/` → 解压物放进 `/turtle/` 文件夹
3. 浏览器访问该 URL 即可 (任意现代浏览器, Chrome / Edge / Firefox / Safari 都支持; 推荐 Chrome 89+)

> 游戏所有资源路径都是相对路径 (`base: './'`), 根目录或任意层级子目录都能直接跑, **不用改任何代码**。

### Nginx 配置示例 (子目录部署)
```nginx
location /turtle/ {
    alias /var/www/turtle-v1.0/;
    try_files $uri $uri/ /turtle/index.html;

    # index.html 不缓存 (保证更新能立刻生效)
    location = /turtle/index.html {
        add_header Cache-Control "no-cache, must-revalidate";
        expires 0;
    }
    # 其他资源 hash 文件名自动失效, 可放心长缓存
    location ~* \.(js|css|png|mp3|ttf|webmanifest)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
```

### Apache `.htaccess` 示例
```apache
# 在 turtle/ 目录里加 .htaccess:
<IfModule mod_headers.c>
    <FilesMatch "index\.html$">
        Header set Cache-Control "no-cache, must-revalidate"
    </FilesMatch>
    <FilesMatch "\.(js|css|png|mp3|ttf)$">
        Header set Cache-Control "public, max-age=2592000, immutable"
    </FilesMatch>
</IfModule>
```

## 浏览器要求
- Chrome 89+ / Edge 89+ / Firefox 90+ / Safari 14+
- 启用 JavaScript (默认就开)
- 桌面端最佳 (1280×720 起步)，移动端横屏可用 (iOS 14+ / Android 9+ Chrome)
- 必须支持 ES2022 (基本现代浏览器都行)

## 数据存档
游戏所有进度 (龟等级 / 解锁状态 / 战绩) 用浏览器 `localStorage` 保存:
- 跟域名挂钩, 玩家清浏览器缓存会丢档
- 不跨域名同步, 不上传服务器
- **iframe 嵌入**: 部分浏览器 (Safari) 默认禁止第三方 iframe 的 localStorage → 建议**直接链接**而不是 iframe 嵌入

## 已知细节
- 启动时控制台可能看到 2 个 404 (`pixel-zh.ttf` / `favicon.ico`) — 不影响游戏, 字体已配 swap 回退
- 首次加载约下载 30-50 MB 资源 (首屏 + 战斗资源), 之后浏览器自动缓存

## 更新流程
之后开发方放出新版 zip (例如 `turtle-v1.1.zip`):
1. 备份当前部署目录 (可选, 防回滚)
2. 解压新 zip, 直接覆盖旧文件
3. 告诉玩家**刷新页面** (`Ctrl+Shift+R` 强制刷新) — 一般 30 秒内自动拿到新版
4. `localStorage` 进度自动保留, 不丢档

## 反馈
- bug 反馈 / 体验问题: [开发方联系方式]
- 反馈时请附:
  - 浏览器 + 版本号
  - 操作步骤 (能复现的话最好)
  - 浏览器控制台错误截图 (`F12` 打开)

---
版本: **v1.0**
日期: 2026-05-30
对应 git tag: `v1.0`
