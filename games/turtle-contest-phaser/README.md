# 龟龟争霸 · Phaser 版（独立子工程）

从 `Turtle-Project-L_Demo/poc-phaser` 迁入，与主站旧版 `public/games/turtle-battle/` **完全分离**。

- 源码：`games/turtle-contest-phaser/src/`
- 构建产物：`public/games/turtle-contest-phaser/`
- 主站路由：`/turtle-contest`（左侧栏「龟龟争霸」）
- 旧版游戏管理：`/games`（顶栏「游戏」）

## 命令

```bash
yarn sync:phaser-battle    # 同步全部图片/音频资产
yarn dev:phaser-battle     # 单独开发
yarn build:phaser-battle   # 构建到 public/
```

资产来源：`turtle-battle/assets` + L_Demo `assets/` + L_Demo `poc-phaser/public/`（含 menu、fonts、vfx、skills 等）。
