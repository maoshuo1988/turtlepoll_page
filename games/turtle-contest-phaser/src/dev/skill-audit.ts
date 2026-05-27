// ══════════════════════════════════════════════════════════
// skill-audit.ts — DEV-only 技能/伤害/效果系统化验证台
// ══════════════════════════════════════════════════════════
// 用户要求逐龟逐技能验证: 正确造成伤害 / 正确施加 DOT / 伤害数值对 / buff 层数对.
// 思路: 用真实 Phaser BattleScene 作 api.scene, 给每个龟 createFighter + 一排 dummy 敌人,
//   逐个主动技能 run handler, 抓 target hp delta + buffs + caster buffs + 抛错.
//   dummy: 0 def/mr → calcDmgMult=1.0 → 伤害 = atkScale×atk (易核对).
import type Phaser from 'phaser';
import type { Fighter, SkillDef } from '../types';
import { createFighter } from '../engine/fighter';
import { SKILL_HANDLERS, setSkillApi, setAuditMode, type BattleApi } from '../engine/skill-handlers';
import { ALL_PETS } from '../data/pets';

interface SkillResult {
  pet: string;
  skill: string;
  type: string;
  atkScale?: number;
  casterAtk: number;
  expectedApprox?: number;   // atkScale × atk (粗略期望, 单段)
  dmgToPrimary: number;      // 主目标 hp+shield 损失
  dmgToAll: number;          // 所有 dummy 总损失 (AoE)
  targetBuffsAfter: string;  // 主目标 debuff 列表
  casterBuffsAfter: string;  // caster 自身 buff 列表
  casterShield: number;      // 自施法护盾
  casterHpDelta: number;     // 自身 HP 变化 (回血为正)
  touched: number;
  error?: string;
}

/** 造 3 个 dummy 敌人 (front-0/1/2), 0 def/mr, 海量 HP */
function makeDummies(): Fighter[] {
  const slots = ['front-0', 'front-1', 'front-2'];
  return slots.map((slotKey, i) => {
    const d = createFighter('basic', 'right') as Fighter & { _slotKey?: string };
    d.id = 'dummy' + i;
    d.name = '木桩' + i;
    d.maxHp = 1_000_000; d.hp = 1_000_000; d.shield = 0;
    d.baseDef = 0; d.def = 0; d.baseMr = 0; d.mr = 0;
    d.crit = 0;
    d._slotKey = slotKey;
    d._position = 'front';
    d.buffs = [];
    return d;
  });
}

function buffSummary(f: Fighter): string {
  if (!f.buffs || !f.buffs.length) return '-';
  return f.buffs.map(b => `${b.type}:${b.value}/${b.duration}`).join(',');
}

export async function runSkillAudit(scene: Phaser.Scene): Promise<SkillResult[]> {
  const results: SkillResult[] = [];
  setAuditMode(true);   // sleep() 瞬时返回, audit 秒级跑完
  try {
  for (const pet of ALL_PETS) {
    // 跳过中立怪 (chest 等也测, 但其 skillPool 多为特殊)
    const pool = pet.skillPool ?? [];
    for (let idx = 0; idx < pool.length; idx++) {
      const sk = pool[idx];
      if (!sk || sk.passiveSkill) continue;   // 只测主动技能
      const type = sk.type;

      // 每个技能新建干净的 caster + dummies
      const caster = createFighter(pet.id, 'left', { equippedIdxs: [idx] }) as Fighter;
      caster.crit = 0;   // 关暴击, 数值可核对
      const dummies = makeDummies();
      const primary = dummies[0];
      const allFighters: Fighter[] = [caster, ...dummies];

      const logLines: string[] = [];
      // 真 Phaser sprite (offscreen) — 让 tweens.chain / 飞行物 tween 正常完成,
      //   避免 mock sprite 触发 hasOwnProperty 崩 / await tween 永不 resolve.
      const sprites = new Map<Fighter, Phaser.GameObjects.Image>();
      const spriteFor = (f: Fighter): Phaser.GameObjects.Image => {
        let s = sprites.get(f);
        if (!s) {
          const sx = f.side === 'left' ? -500 : -400;   // 屏外, 不干扰真实战斗渲染
          s = scene.add.image(sx, -500, '__DEFAULT').setVisible(false);
          sprites.set(f, s);
        }
        return s;
      };
      const api: BattleApi = {
        scene,
        allFighters,
        floatNum: () => { /* no-op */ },
        viewOf: (f: Fighter) => {
          const sp = spriteFor(f);
          return { x: sp.x, y: sp.y, homeX: sp.x, homeY: sp.y, sprite: sp };
        },
        knockup: () => { /* no-op */ },
        log: (t: string) => logLines.push(t),
      };

      const hpBeforeAll = dummies.map(d => d.hp + d.shield);
      const casterHpBefore = caster.hp;
      const skillWithCd = { ...sk, cdLeft: 0 } as SkillDef & { cdLeft: number };
      let touched = 0;
      let error: string | undefined;
      try {
        setSkillApi(api);
        const handler = SKILL_HANDLERS[type] ?? SKILL_HANDLERS.physical;
        // 超时保护用 JS 定时器 (audit mode 下 scene 计时器不参与, sleep 已瞬时)
        const res = await Promise.race([
          handler(api, caster, primary, skillWithCd),
          new Promise<{ touched: Fighter[] }>((_, rej) => setTimeout(() => rej(new Error('timeout 3s')), 3000)),
        ]);
        touched = res?.touched?.length ?? 0;
      } catch (e) {
        error = e instanceof Error ? e.message : String(e);
      } finally {
        setSkillApi(null);
        // 销毁本技能用过的临时 sprite (含 handler 内 add 的 VFX 由 Phaser 自管, 这里只清我们的)
        sprites.forEach(s => { try { s.destroy(); } catch { /* ignore */ } });
        sprites.clear();
      }

      const dmgToPrimary = hpBeforeAll[0] - (primary.hp + primary.shield);
      const dmgToAll = dummies.reduce((s, d, i) => s + (hpBeforeAll[i] - (d.hp + d.shield)), 0);
      const atkScale = typeof sk.atkScale === 'number' ? sk.atkScale : undefined;

      results.push({
        pet: pet.id,
        skill: sk.name,
        type,
        atkScale,
        casterAtk: caster.atk,
        expectedApprox: atkScale != null ? Math.round(atkScale * caster.atk) : undefined,
        dmgToPrimary,
        dmgToAll,
        targetBuffsAfter: buffSummary(primary),
        casterBuffsAfter: buffSummary(caster),
        casterShield: caster.shield ?? 0,
        casterHpDelta: caster.hp - casterHpBefore,
        touched,
        error,
      });
    }
  }
  } finally {
    setAuditMode(false);
  }

  return results;
}
