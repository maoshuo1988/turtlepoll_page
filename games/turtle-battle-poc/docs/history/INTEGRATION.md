# 龟龟对战 — 接入说明

这是一个纯静态前端游戏，无后端。解压即用，能放进任意网站。

## 三步接入

1. **解压** `dist.zip` → 得到 `dist/` 文件夹。
2. **放到你的网站静态目录**（任意位置，比如 `你的网站/games/turtle/`）。
3. **用 iframe 嵌入**，指向里面的 `index.html`：

```html
<iframe src="/games/turtle/index.html"
        style="width:100%;height:100%;border:0"
        allow="autoplay; fullscreen"></iframe>
```

完事。不用装环境、不用编译。

## ⚠️ 唯一注意
必须通过 **HTTP(S) 服务器** 访问，**不能直接双击 `index.html`**（`file://` 会白屏）。
本地想先试：在 `dist/` 目录跑 `npx serve` 即可。

## （可选）控制玩家拥有哪些龟
游戏用 `localStorage` 的 `petState` 记录进度。同源页面写入它即可控制龟/等级/龟币：
```js
localStorage.setItem('petState', JSON.stringify({
  pets: [{ id: 'basic', owned: true }, { id: 'stone', owned: true }],  // 只列出的可用; 不写 pets = 28 龟全开
  levels: { basic: 5 },   // 1-10
  coins: 1000,
}));
```
不需要这功能就忽略本节，游戏默认全部可用。
