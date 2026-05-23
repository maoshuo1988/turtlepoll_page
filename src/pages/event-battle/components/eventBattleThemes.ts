/** 文件说明：真实撕裂带视觉主题，负责按场次生成左右阵营颜色和图片。 */

export interface EventBattleThemeSide {
  primary: string;
  accent: string;
  deep: string;
  rgb: string;
  imageUrl: string;
  buttonGradient: string;
  heroGlow: string;
}

export interface EventBattleTheme {
  id: string;
  sideA: EventBattleThemeSide;
  sideB: EventBattleThemeSide;
}

type ThemePalette = {
  id: string;
  sideA: Omit<EventBattleThemeSide, 'imageUrl'> & { icon: string };
  sideB: Omit<EventBattleThemeSide, 'imageUrl'> & { icon: string };
};

type TopicBattleImagePair = {
  sideA: string;
  sideB: string;
};

const THEME_PALETTES: ThemePalette[] = [
  {
    id: 'neon-cyan-crimson',
    sideA: {
      icon: '⚡',
      primary: '#1597ff',
      accent: '#5de8ff',
      deep: '#0d3d8b',
      rgb: '21, 151, 255',
      buttonGradient: 'linear-gradient(135deg,#1597ff,#0d3d8b)',
      heroGlow: 'radial-gradient(circle at 0 42%, rgba(21,151,255,0.46), transparent 54%)',
    },
    sideB: {
      icon: '🔥',
      primary: '#ff3145',
      accent: '#ff8c98',
      deep: '#8d1425',
      rgb: '255, 49, 69',
      buttonGradient: 'linear-gradient(135deg,#ff3145,#8d1425)',
      heroGlow: 'radial-gradient(circle at 100% 42%, rgba(255,49,69,0.44), transparent 56%)',
    },
  },
  {
    id: 'emerald-violet',
    sideA: {
      icon: '🛡️',
      primary: '#11c98f',
      accent: '#7ef7cf',
      deep: '#0d6a58',
      rgb: '17, 201, 143',
      buttonGradient: 'linear-gradient(135deg,#11c98f,#0d6a58)',
      heroGlow: 'radial-gradient(circle at 0 42%, rgba(17,201,143,0.44), transparent 54%)',
    },
    sideB: {
      icon: '🌌',
      primary: '#8a5cff',
      accent: '#ccb8ff',
      deep: '#4d2d9f',
      rgb: '138, 92, 255',
      buttonGradient: 'linear-gradient(135deg,#8a5cff,#4d2d9f)',
      heroGlow: 'radial-gradient(circle at 100% 42%, rgba(138,92,255,0.42), transparent 56%)',
    },
  },
  {
    id: 'amber-cobalt',
    sideA: {
      icon: '☀️',
      primary: '#f59e0b',
      accent: '#ffd36f',
      deep: '#9a5b05',
      rgb: '245, 158, 11',
      buttonGradient: 'linear-gradient(135deg,#f59e0b,#9a5b05)',
      heroGlow: 'radial-gradient(circle at 0 42%, rgba(245,158,11,0.46), transparent 54%)',
    },
    sideB: {
      icon: '🌊',
      primary: '#2563eb',
      accent: '#8db8ff',
      deep: '#173a96',
      rgb: '37, 99, 235',
      buttonGradient: 'linear-gradient(135deg,#2563eb,#173a96)',
      heroGlow: 'radial-gradient(circle at 100% 42%, rgba(37,99,235,0.42), transparent 56%)',
    },
  },
  {
    id: 'teal-rose',
    sideA: {
      icon: '🌿',
      primary: '#14b8a6',
      accent: '#88fff2',
      deep: '#0d7468',
      rgb: '20, 184, 166',
      buttonGradient: 'linear-gradient(135deg,#14b8a6,#0d7468)',
      heroGlow: 'radial-gradient(circle at 0 42%, rgba(20,184,166,0.44), transparent 54%)',
    },
    sideB: {
      icon: '🌹',
      primary: '#e11d48',
      accent: '#ff9db5',
      deep: '#8d1733',
      rgb: '225, 29, 72',
      buttonGradient: 'linear-gradient(135deg,#e11d48,#8d1733)',
      heroGlow: 'radial-gradient(circle at 100% 42%, rgba(225,29,72,0.42), transparent 56%)',
    },
  },
  {
    id: 'lime-fuchsia',
    sideA: {
      icon: '🧪',
      primary: '#84cc16',
      accent: '#d8ff92',
      deep: '#4e7b0f',
      rgb: '132, 204, 22',
      buttonGradient: 'linear-gradient(135deg,#84cc16,#4e7b0f)',
      heroGlow: 'radial-gradient(circle at 0 42%, rgba(132,204,22,0.42), transparent 54%)',
    },
    sideB: {
      icon: '💥',
      primary: '#d946ef',
      accent: '#f6b0ff',
      deep: '#8f1ea3',
      rgb: '217, 70, 239',
      buttonGradient: 'linear-gradient(135deg,#d946ef,#8f1ea3)',
      heroGlow: 'radial-gradient(circle at 100% 42%, rgba(217,70,239,0.42), transparent 56%)',
    },
  },
];

const TOPIC_BATTLE_IMAGE_MAP: Record<string, TopicBattleImagePair> = {
  '1': {
    sideA: '/sports/2.jpg',
    sideB: '/sports/1.jpg',
  },
  '2': {
    sideA: '/sports/4.jpg',
    sideB: '/sports/3.jpg',
  },
};

function hashSeed(seed: string) {
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }
  return hash;
}

function buildSideImage({
  icon,
  label,
  primary,
  accent,
  deep,
}: {
  icon: string;
  label: string;
  primary: string;
  accent: string;
  deep: string;
}) {
  const title = label.trim().slice(0, 12) || 'BATTLE';
  const initials = title.slice(0, 2).toUpperCase();
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 960">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${deep}" />
          <stop offset="55%" stop-color="${primary}" />
          <stop offset="100%" stop-color="${accent}" />
        </linearGradient>
        <radialGradient id="glow" cx="50%" cy="35%" r="56%">
          <stop offset="0%" stop-color="${accent}" stop-opacity="0.92" />
          <stop offset="100%" stop-color="${accent}" stop-opacity="0" />
        </radialGradient>
      </defs>
      <rect width="720" height="960" fill="#040913" />
      <rect width="720" height="960" fill="url(#bg)" opacity="0.92" />
      <circle cx="520" cy="220" r="220" fill="url(#glow)" />
      <circle cx="180" cy="720" r="140" fill="${accent}" fill-opacity="0.18" />
      <path d="M0 820C120 760 220 700 346 686C465 672 556 724 720 820V960H0Z" fill="rgba(0,0,0,0.28)" />
      <text x="68" y="180" fill="rgba(255,255,255,0.94)" font-size="98" font-family="Arial, sans-serif">${icon}</text>
      <text x="72" y="560" fill="rgba(255,255,255,0.98)" font-size="248" font-family="Arial, sans-serif" font-weight="800">${initials}</text>
      <text x="76" y="646" fill="rgba(255,255,255,0.62)" font-size="48" font-family="Arial, sans-serif" letter-spacing="6">${title}</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export function resolveEventBattleTheme(seed: string | number, leftLabel: string, rightLabel: string): EventBattleTheme {
  const normalizedSeed = String(seed || 'event-battle');
  const palette = THEME_PALETTES[hashSeed(normalizedSeed) % THEME_PALETTES.length];
  const topicBattleImages = TOPIC_BATTLE_IMAGE_MAP[normalizedSeed];

  return {
    id: palette.id,
    sideA: {
      primary: palette.sideA.primary,
      accent: palette.sideA.accent,
      deep: palette.sideA.deep,
      rgb: palette.sideA.rgb,
      buttonGradient: palette.sideA.buttonGradient,
      heroGlow: palette.sideA.heroGlow,
      imageUrl: topicBattleImages?.sideA ?? buildSideImage({
        icon: palette.sideA.icon,
        label: leftLabel,
        primary: palette.sideA.primary,
        accent: palette.sideA.accent,
        deep: palette.sideA.deep,
      }),
    },
    sideB: {
      primary: palette.sideB.primary,
      accent: palette.sideB.accent,
      deep: palette.sideB.deep,
      rgb: palette.sideB.rgb,
      buttonGradient: palette.sideB.buttonGradient,
      heroGlow: palette.sideB.heroGlow,
      imageUrl: topicBattleImages?.sideB ?? buildSideImage({
        icon: palette.sideB.icon,
        label: rightLabel,
        primary: palette.sideB.primary,
        accent: palette.sideB.accent,
        deep: palette.sideB.deep,
      }),
    },
  };
}
