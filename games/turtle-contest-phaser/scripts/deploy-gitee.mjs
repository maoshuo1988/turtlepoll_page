// deploy-gitee.mjs — 一键部署到 Gitee Pages
// ─────────────────────────────────────────────────────────
// Gitee Pages 免费版只托管静态文件、不自动构建, 所以本脚本:
//   1) npm run build  → 产出 dist/ (纯静态)
//   2) 在 dist/ 里临时初始化 git, 全量提交
//   3) 强推到你的 Gitee 仓库 master 分支根目录
//   (vite build 每次清空 dist/, 故 git 仓库每次重建 + force push, 无需保留历史)
//
// 用法 (二选一):
//   GITEE_PAGES_REPO=https://gitee.com/<用户名>/<仓库>.git npm run deploy:gitee
//   node scripts/deploy-gitee.mjs https://gitee.com/<用户名>/<仓库>.git
//
// 推送后, 去 Gitee 仓库页 → 服务 → Gitee Pages → 选 master 分支 / 根目录 → 启动 (首次)
//   或「更新」(之后每次). 免费版需手动点更新, 几十秒后生效。
//   网址: https://<用户名>.gitee.io/<仓库>/

import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');

const repo = process.argv[2] || process.env.GITEE_PAGES_REPO;
if (!repo) {
  console.error('✗ 缺少 Gitee 仓库地址。用法:');
  console.error('  node scripts/deploy-gitee.mjs https://gitee.com/<用户名>/<仓库>.git');
  console.error('  或设环境变量 GITEE_PAGES_REPO 后 npm run deploy:gitee');
  process.exit(1);
}

const run = (cmd, cwd = ROOT) => {
  console.log(`\n$ ${cmd}`);
  execSync(cmd, { cwd, stdio: 'inherit' });
};
// 允许失败的 run (返回是否成功), 用于 push 给出友好提示
const tryRun = (cmd, cwd = ROOT) => {
  console.log(`\n$ ${cmd}`);
  try { execSync(cmd, { cwd, stdio: 'inherit' }); return true; }
  catch { return false; }
};

// 1) 构建
run('npm run build');
if (!existsSync(path.join(DIST, 'index.html'))) {
  console.error('✗ dist/index.html 不存在, 构建可能失败。');
  process.exit(1);
}

// 2) 在 dist 里临时建 git + 提交 (core.quotepath=false 保证中文文件名不被转义)
const ts = new Date().toISOString().replace('T', ' ').slice(0, 19);
run('git init -q', DIST);
run('git config core.quotepath false', DIST);
run('git config user.email deploy@local && git config user.name deploy', DIST);
run('git checkout -q -B master', DIST);
run('git add -A', DIST);
// --allow-empty: Vite 清 dist 时保留 .git, 重建产物相同会「nothing to commit」, 空提交保证仍能推
run(`git commit -q --allow-empty -m "deploy ${ts}"`, DIST);

// 3) 强推到 Gitee master 根目录
const ok = tryRun(`git push -f ${repo} master`, DIST);
if (!ok) {
  console.error('\n✗ 推送失败 — 基本都是 Gitee 认证问题。请按以下处理:');
  console.error('  1) Gitee → 设置 → 安全设置 → 私人令牌 → 生成新令牌 (勾 projects), 复制令牌串');
  console.error('  2) 推送时 用户名=Gitee用户名, 密码=粘贴那个令牌 (不是登录密码)');
  console.error('  3) 若之前存了错密码: Windows「凭据管理器」→ Windows 凭据 → 删 git:https://gitee.com');
  console.error('  4) 重跑: node scripts/deploy-gitee.mjs <仓库地址>');
  console.error('  或一次性把令牌塞进地址(注意会留在命令历史):');
  console.error('     node scripts/deploy-gitee.mjs https://用户名:令牌@gitee.com/LYZ/<仓库>.git');
  process.exit(1);
}

console.log('\n✓ 已推送到 Gitee。下一步: 仓库页 → 服务 → Gitee Pages → 启动/更新。');
console.log('  (免费版每次部署后需手动点「更新」)');
