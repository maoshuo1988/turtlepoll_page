/**
 * 文件说明：龟战 Arena - 技能树 Section，按攻击/防御/辅助 三条分支展示节点状态。
 */
import { Lock, Sparkles } from 'lucide-react';
import { mockArenaSkillNodes } from '../../data/arenaMockData';

const BRANCH_META: Record<'attack' | 'defense' | 'support', { label: string; color: string; bg: string }> = {
  attack: { label: '攻击天赋', color: 'text-rose-200', bg: 'border-rose-400/30 bg-rose-500/8' },
  defense: { label: '防御天赋', color: 'text-amber-200', bg: 'border-amber-400/30 bg-amber-500/8' },
  support: { label: '辅助天赋', color: 'text-emerald-200', bg: 'border-emerald-400/30 bg-emerald-500/8' },
};

export function SkillTreeSection() {
  const branches: Array<'attack' | 'defense' | 'support'> = ['attack', 'defense', 'support'];

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-[20px] font-black tracking-tight text-white md:text-[22px]">技能树</h2>
        <p className="text-[12px] text-white/55">投资天赋点解锁主动 / 被动节点 · 每升 1 级获得 1 点天赋</p>
      </div>

      <div className="flex items-center gap-3 rounded-2xl border border-amber-400/22 bg-amber-500/8 p-3">
        <Sparkles size={20} className="text-amber-300" />
        <div className="flex-1">
          <div className="text-[12px] text-amber-200/65">可用天赋点</div>
          <div className="text-[20px] font-black tabular-nums text-amber-100">3</div>
        </div>
        <button type="button" className="rounded-full border border-amber-300/55 bg-amber-500/22 px-4 py-1.5 text-xs font-bold text-amber-100 hover:bg-amber-500/32">
          一键重置
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {branches.map((branch) => {
          const nodes = mockArenaSkillNodes.filter((n) => n.branch === branch);
          const meta = BRANCH_META[branch];
          return (
            <div key={branch} className={`rounded-2xl border p-4 ${meta.bg}`}>
              <div className="mb-3 flex items-center justify-between">
                <h3 className={`text-[14px] font-black ${meta.color}`}>{meta.label}</h3>
                <span className="text-[10px] font-medium text-white/45">
                  {nodes.filter((n) => n.unlocked).length} / {nodes.length}
                </span>
              </div>
              <div className="space-y-3">
                {nodes.map((node) => (
                  <div
                    key={node.id}
                    className={`relative rounded-xl border p-3 transition-colors ${
                      node.unlocked
                        ? 'border-white/12 bg-black/30'
                        : 'border-white/6 bg-black/15 opacity-65'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-black/40 text-[18px]">{node.icon}</span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="truncate text-[13px] font-bold text-white">{node.name}</span>
                          {!node.unlocked ? <Lock size={11} className="shrink-0 text-white/35" /> : null}
                        </div>
                        <div className="text-[10px] text-white/45">
                          Lv.{node.level} / {node.maxLevel}
                        </div>
                      </div>
                    </div>
                    <p className="mt-2 text-[11px] leading-relaxed text-white/55">{node.description}</p>
                    {node.unlocked ? (
                      <div className="mt-2 h-1 overflow-hidden rounded-full bg-black/40">
                        <div
                          className={`h-full rounded-full ${
                            branch === 'attack' ? 'bg-rose-400' : branch === 'defense' ? 'bg-amber-400' : 'bg-emerald-400'
                          }`}
                          style={{ width: `${(node.level / node.maxLevel) * 100}%` }}
                        />
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
