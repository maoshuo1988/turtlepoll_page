/**
 * 文件说明：按中文队名解析国旗图（接口未下发 side 图时给移动端暗盘用）。
 */
const TEAM_FLAG_CODE_BY_NAME: Record<string, string> = {
  阿根廷: 'ar',
  比利时: 'be',
  巴西: 'br',
  德国: 'de',
  法国: 'fr',
  海地: 'ht',
  韩国: 'kr',
  荷兰: 'nl',
  墨西哥: 'mx',
  摩洛哥: 'ma',
  葡萄牙: 'pt',
  南非: 'za',
  苏格兰: 'gb-sct',
  西班牙: 'es',
  英格兰: 'gb-eng',
  捷克: 'cz',
  乌拉圭: 'uy',
  美国: 'us',
  日本: 'jp',
  澳大利亚: 'au',
  加拿大: 'ca',
  克罗地亚: 'hr',
  丹麦: 'dk',
  厄瓜多尔: 'ec',
  伊朗: 'ir',
  加纳: 'gh',
  喀麦隆: 'cm',
  卡塔尔: 'qa',
  哥斯达黎加: 'cr',
  哥伦比亚: 'co',
  波兰: 'pl',
  瑞士: 'ch',
  塞尔维亚: 'rs',
  塞内加尔: 'sn',
  突尼斯: 'tn',
  威尔士: 'gb-wls',
  乌克兰: 'ua',
  意大利: 'it',
  智利: 'cl',
  秘鲁: 'pe',
  巴拉圭: 'py',
  尼日利亚: 'ng',
  沙特: 'sa',
  瑞典: 'se',
  土耳其: 'tr',
  中国: 'cn',
};

function normalizeTeamName(name?: string) {
  return String(name ?? '')
    .trim()
    .replace(/\s+/g, '')
    .replace(/(队|国家队|男足|女足)$/u, '');
}

export function resolveTeamFlagUrlByName(name?: string, size = 80): string | undefined {
  const normalized = normalizeTeamName(name);
  if (!normalized) return undefined;

  const code = TEAM_FLAG_CODE_BY_NAME[normalized];
  if (!code) return undefined;

  return `https://flagcdn.com/w${size}/${code}.png`;
}

export function resolveTeamFlagPair(optionA?: string, optionB?: string, size = 80) {
  return {
    sideA: resolveTeamFlagUrlByName(optionA, size),
    sideB: resolveTeamFlagUrlByName(optionB, size),
  };
}
