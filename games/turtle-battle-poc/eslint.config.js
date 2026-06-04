import js from '@eslint/js';
import tseslint from 'typescript-eslint';

// 宽松配置: 35k 行遗留代码从未 lint 过, 故只开"能抓真 bug"的规则, 风格类全关/降级 warn。
// tsc 已做强类型检查; 这里补它覆盖不到的: 自比较/自赋值/常量条件/漏 break 等逻辑陷阱。
export default tseslint.config(
  { ignores: ['dist/**', 'public/**', 'node_modules/**', '**/*.config.*', 'scripts/**', '**/*.test.ts'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      // —— 遗留代码噪音大, 关掉/降级 ——
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' }],
      '@typescript-eslint/no-non-null-assertion': 'off',
      'no-empty': ['warn', { allowEmptyCatch: true }],
      'prefer-const': 'warn',
      'no-cond-assign': 'off',
      // eslint 10 新增 recommended, 对本库多为良性/有意 (中文全角空格 / 引用用死代码) → 降 warn
      'no-irregular-whitespace': 'off',     // 中文 UI 文案里的全角空格是有意的
      'no-useless-assignment': 'warn',
      'no-unreachable': 'warn',             // turtle-hud 有"早 return + 保留引用体"的有意死代码
      // —— 真 bug 捕获 (error) ——
      'no-constant-condition': ['error', { checkLoops: false }],
      'no-self-assign': 'error',
      'no-self-compare': 'error',
      'no-unsafe-negation': 'error',
      'no-fallthrough': 'error',
      'no-dupe-keys': 'error',
      'no-dupe-else-if': 'error',
      'no-duplicate-case': 'error',
      'use-isnan': 'error',
    },
  },
);
