export function getPetDisplayAvatar(petKey?: string | null, petName?: string | null) {
  const source = `${petKey ?? ''} ${petName ?? ''}`.toLowerCase();

  if (source.includes('phoenix') || source.includes('凤凰')) return '🔥🐢';
  if (source.includes('ninja') || source.includes('忍者')) return '🥷🐢';
  if (source.includes('pirate') || source.includes('海盗')) return '🏴‍☠️🐢';
  if (source.includes('angel') || source.includes('天使')) return '😇🐢';
  if (source.includes('crystal') || source.includes('水晶')) return '🔮🐢';
  if (source.includes('cyber') || source.includes('赛博')) return '🤖🐢';
  if (source.includes('dice') || source.includes('骰子')) return '🎲🐢';
  if (source.includes('fortune') || source.includes('财神')) return '🧧🐢';
  if (source.includes('diamond') || source.includes('钻石')) return '💎🐢';
  if (source.includes('space') || source.includes('星际')) return '🚀🐢';
  if (source.includes('stone') || source.includes('石头')) return '🪨🐢';
  if (source.includes('ice') || source.includes('寒冰')) return '❄️🐢';
  if (source.includes('ghost') || source.includes('幽灵')) return '👻🐢';
  if (source.includes('bubble') || source.includes('气泡')) return '🫧🐢';
  if (source.includes('rainbow') || source.includes('彩虹')) return '🌈🐢';
  if (source.includes('candy') || source.includes('糖果')) return '🍬🐢';
  if (source.includes('hunter') || source.includes('猎人')) return '🏹🐢';
  if (source.includes('gambler') || source.includes('赌神')) return '🃏🐢';
  if (source.includes('lava') || source.includes('熔岩')) return '🌋🐢';
  if (source.includes('headless') || source.includes('无头')) return '💀🐢';
  if (source.includes('shell') || source.includes('龟壳')) return '🐚';
  return '🐢';
}

export function getPetMoodLabel(moodState?: string | { label?: string; state?: string; description?: string }) {
  if (!moodState) return '状态稳定';
  if (typeof moodState === 'string') return moodState;
  return moodState.label || moodState.state || moodState.description || '状态稳定';
}
