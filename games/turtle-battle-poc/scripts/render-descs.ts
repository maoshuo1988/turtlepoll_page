// 一次性渲染全部龟描述为可读 markdown (token 解析 + 去 HTML), 用于人工验收。
// 用法: esbuild 打包后 node 运行 (见 render-descs 调用)。base 等级=1, 不乘稀有度系数。
import { ALL_PETS } from '../src/data/pets';
import { renderSkillTemplate, type SkillCtx } from '../src/systems/skill-text';

const strip = (html: string): string =>
  (html || '').replace(/<[^>]+>/g, '').replace(/\n/g, '\n    ').trim();

const ctxOf = (pet: any): SkillCtx => ({
  atk: pet.atk, def: pet.def, mr: pet.mr ?? pet.def, maxHp: pet.hp, crit: pet.crit ?? 0.25, lv: 1,
  // 让 buildSkillVars 能读 passive 字段(capTurns/maxDefInitPct 等)与 baseDef, 减少 NaN
  passive: pet.passive, baseDef: pet.def, _initDef: pet.def,
} as any);

const out: string[] = ['# 全龟描述验收（base 数值 / Lv.1，实战随稀有度×等级上浮）\n'];

for (const pet of ALL_PETS as any[]) {
  const ctx = ctxOf(pet);
  out.push(`\n## ${pet.emoji ?? ''} ${pet.name}（${pet.rarity}）  ATK ${pet.atk} / HP ${pet.hp} / DEF ${pet.def} / MR ${pet.mr ?? pet.def}`);
  if (pet.passive) {
    const p = pet.passive;
    out.push(`\n**被动「${p.name}」**`);
    out.push(`- brief：${strip(renderSkillTemplate(p.brief ?? '', ctx, p))}`);
    out.push(`- desc：${strip(renderSkillTemplate(p.desc ?? '', ctx, p))}`);
    if (p.descVolcano) out.push(`- descVolcano：${strip(renderSkillTemplate(p.descVolcano, ctx, p))}`);
  }
  const renderSkills = (skills: any[], label?: string) => {
    if (!skills?.length) return;
    if (label) out.push(`\n*${label}*`);
    for (const s of skills) {
      const tag = [s.cd ? `cd${s.cd}` : null, s.hits > 1 ? `${s.hits}段` : null, s.aoe ? 'aoe' : null, s.passiveSkill ? '被动' : null].filter(Boolean).join('/');
      out.push(`\n**${s.name}**${tag ? `（${tag}）` : ''}`);
      out.push(`- brief：${strip(renderSkillTemplate(s.brief ?? '', ctx, s))}`);
      out.push(`- detail：${strip(renderSkillTemplate(s.detail ?? s.brief ?? '', ctx, s))}`);
    }
  };
  renderSkills(pet.skillPool);
  renderSkills(pet.volcanoSkills, '火山形态技能');
}

// eslint-disable-next-line no-console
console.log(out.join('\n'));
