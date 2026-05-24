/**
 * 文件说明：Profile Pet Rail，个人主页页面组件。
 */
import React, { useMemo } from 'react';
import { Sparkles } from 'lucide-react';
import type { PetInfo, PetSkin } from '@/components/common/pet/petTypes';
import { RARITY_COLORS } from '@/components/common/pet/petSkinStyles';

interface ProfilePetRailProps {
  pet: PetInfo;
  skins: PetSkin[];
  balance: number;
  compact?: boolean;
}

const panelClass = 'rounded-[22px] border border-white/8 bg-white/[0.03] !p-2';

const PetPanel: React.FC<{ title: string; icon: React.ReactNode; children: React.ReactNode }> = ({
  title,
  icon,
  children,
}) => (
  <section className={panelClass}>
    <div className="!mb-2 flex items-center gap-2 text-[13px] font-bold tracking-[0.02em] text-[#dbe2e8]">
      <span className="text-[#9fb0bf]">{icon}</span>
      {title}
    </div>
    <div className="mt-4">{children}</div>
  </section>
);

export const ProfilePetRail: React.FC<ProfilePetRailProps> = ({
  pet,
  skins,
  balance,
  compact = false,
}) => {
  const equippedSkin = useMemo(
    () => skins.find((skin) => skin.equipped) ?? skins.find((skin) => skin.owned) ?? null,
    [skins],
  );
  const staminaPct = Math.round((pet.stamina / pet.maxStamina) * 100);

  return (
    <div className={`grid ${compact ? 'gap-3 px-0 py-0' : 'gap-4 !px-4 !py-4'}`}>
      <PetPanel title="宠物档案" icon={<Sparkles size={15} />}>
        <div className={`overflow-hidden rounded-[20px] border border-emerald-400/10 bg-[radial-gradient(circle_at_top,rgba(70,180,120,0.18),transparent_46%),linear-gradient(180deg,rgba(18,24,20,1)_0%,rgba(11,14,13,1)_100%)] ${compact ? 'p-4' : '!p-5'}`}>
          <div className={`flex ${compact ? 'items-center gap-3' : 'items-start gap-4'}`}>
            <div className={`relative grid place-items-center rounded-[24px] border border-white/10 bg-white/[0.04] text-[42px] shadow-[inset_0_0_24px_rgba(255,255,255,0.03)] ${compact ? 'h-16 w-16 text-[34px]' : 'h-20 w-20'}`}>
              {pet.avatar}
              <div className="absolute -bottom-2 left-1/2 h-3 w-12 -translate-x-1/2 rounded-full bg-black/30 blur-md" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="truncate text-[20px] font-black tracking-[-0.02em] text-white">{pet.name}</h3>
                <span className="rounded-full bg-emerald-400/20 !px-2 !py-1 text-[11px] font-bold text-emerald-300">
                  Lv.{pet.level}
                </span>
              </div>
              <p className="!mt-1 text-[13px] text-[#92a19a]">{pet.status}</p>
              <div className={`grid grid-cols-2 gap-3 ${compact ? 'mt-3' : '!mt-4'}`}>
                <div className="rounded-2xl border border-white/6 bg-white/[0.03] !px-3 !py-3">
                  <div className="text-[11px] text-[#81909a]">体力</div>
                  <div className="!mt-2 flex items-center gap-2">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/8">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-300"
                        style={{ width: `${staminaPct}%` }}
                      />
                    </div>
                    <span className="text-[12px] font-bold text-emerald-300">{pet.stamina}/{pet.maxStamina}</span>
                  </div>
                </div>
                <div className="rounded-2xl border border-white/6 bg-white/[0.03] !px-3 !py-3">
                  <div className="text-[11px] text-[#81909a]">龟币余额</div>
                  <div className="!mt-2 text-[20px] font-black text-white">{balance.toLocaleString()}</div>
                </div>
              </div>
            </div>
          </div>

          {equippedSkin && !compact && (
            <div className="!mt-4 rounded-[18px] border border-white/6 bg-black/30 !px-4 !py-3">
              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/[0.04] text-[28px]">
                  {equippedSkin.avatar}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-[14px] font-bold text-white">{equippedSkin.name}</span>
                    <span className={`rounded-full !px-2 !py-0.5 text-[10px] font-bold ${RARITY_COLORS[equippedSkin.rarity]}`}>
                      {equippedSkin.rarity}
                    </span>
                  </div>
                  <p className="!mt-1 text-[12px] leading-5 text-[#91a0aa]">{equippedSkin.description}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </PetPanel>

      {/* {compact ? (
        <div className="grid grid-cols-3 gap-3">
          <section className={panelClass}>
            <div className="text-[11px] text-[#82919a]">皮肤</div>
            <div className="mt-2 text-[20px] font-black text-white">{ownedSkins.length}</div>
          </section>
          <section className={panelClass}>
            <div className="text-[11px] text-[#82919a]">技能</div>
            <div className="mt-2 text-[20px] font-black text-white">{unlockedSkills.length}</div>
          </section>
          <section className={panelClass}>
            <div className="text-[11px] text-[#82919a]">任务</div>
            <div className="mt-2 text-[20px] font-black text-white">{dailyTasks.length}</div>
          </section>
        </div>
      ) : null} */}

      {/* {compact ? (
        <PetPanel title="当前任务" icon={<Star size={15} />}>
          <div className="rounded-2xl border border-white/8 bg-black/25 px-4 py-3">
            <div className="flex items-start gap-3">
              <div className="grid h-9 w-9 place-items-center rounded-2xl bg-white/[0.05] text-[18px]">{nextTask.icon}</div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-[13px] font-bold text-white">{nextTask.title}</div>
                  <div className="text-[11px] font-bold text-emerald-300">
                    {nextTask.progress}/{nextTask.total}
                  </div>
                </div>
                <div className="mt-1 text-[12px] text-[#8e9ca6]">{nextTask.description}</div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/8">
                  <div
                    className={`h-full rounded-full ${nextTask.completed ? 'bg-emerald-400' : 'bg-sky-400'}`}
                    style={{ width: `${(nextTask.progress / nextTask.total) * 100}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </PetPanel>
      ) : null} */}

      {!compact && (
      <>
      {/* <PetPanel title="宠物成长" icon={<Leaf size={15} />}>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-white/8 bg-black/25 !px-4 !py-4">
            <div className="text-[11px] text-[#82919a]">已拥有皮肤</div>
            <div className="!mt-2 text-[22px] font-black text-white">{ownedSkins.length}</div>
          </div>
          <div className="rounded-2xl border border-white/8 bg-black/25 !px-4 !py-4">
            <div className="text-[11px] text-[#82919a]">已解锁技能</div>
            <div className="!mt-2 text-[22px] font-black text-white">{unlockedSkills.length}</div>
          </div>
          <div className="rounded-2xl border border-white/8 bg-black/25 !px-4 !py-4">
            <div className="text-[11px] text-[#82919a]">已获成就</div>
            <div className="!mt-2 text-[22px] font-black text-white">{completedAchievements.length}</div>
          </div>
          <div className="rounded-2xl border border-white/8 bg-black/25 !px-4 !py-4">
            <div className="text-[11px] text-[#82919a]">回忆记录</div>
            <div className="!mt-2 text-[22px] font-black text-white">{petMemories.length}</div>
          </div>
        </div>
      </PetPanel> */}

      {/* <PetPanel title="当前能力" icon={<Zap size={15} />}>
        <div className="rounded-2xl border border-emerald-400/12 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.12),transparent_44%),rgba(0,0,0,0.25)] !px-4 !py-4">
          <div className="flex items-start gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-emerald-400/10 text-[20px]">
              {pet.avatar}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[14px] font-bold text-white">{currentAbility.displayName}</span>
                <span className="rounded-full bg-white/[0.06] !px-2 !py-0.5 text-[10px] font-semibold text-[#98a6b0]">
                  龟种ID：{currentAbility.id}
                </span>
                <span className="rounded-full bg-emerald-400/14 !px-2 !py-0.5 text-[10px] font-bold text-emerald-300">
                  {currentAbility.displayRarity} · Lv.{currentAbility.level}
                </span>
              </div>
              <p className="!mt-2 text-[12px] leading-6 text-[#aeb8bf]">{currentAbility.ability}</p>
            </div>
          </div>
        </div>
      </PetPanel> */}

      {/* <PetPanel title="任务与成就" icon={<Star size={15} />}>
        <div className="grid gap-4">
          <div>
            <div className="!mb-3 text-[12px] font-bold text-[#dbe2e8]">每日任务</div>
            <div className="grid gap-3">
              {dailyTasks.map((task) => (
                <div key={task.id} className="rounded-2xl border border-white/8 bg-black/25 !px-4 !py-3">
                  <div className="flex items-start gap-3">
                    <div className="grid h-9 w-9 place-items-center rounded-2xl bg-white/[0.05] text-[18px]">{task.icon}</div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-[13px] font-bold text-white">{task.title}</div>
                        <div className="text-[11px] font-bold text-emerald-300">
                          {task.progress}/{task.total}
                        </div>
                      </div>
                      <div className="!mt-1 text-[12px] text-[#8e9ca6]">{task.description}</div>
                      <div className="!mt-2 !h-1.5 overflow-hidden rounded-full bg-white/8">
                        <div
                          className={`h-full rounded-full ${task.completed ? 'bg-emerald-400' : 'bg-sky-400'}`}
                          style={{ width: `${(task.progress / task.total) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="!mb-3 text-[12px] font-bold text-[#dbe2e8]">成就墙</div>
            <div className="grid gap-3">
              {petAchievements.map((achievement) => (
                <div
                  key={achievement.id}
                  className={`rounded-2xl border !px-4 !py-3 ${
                    achievement.unlocked ? 'border-amber-400/15 bg-amber-400/[0.05]' : 'border-white/8 bg-black/25 opacity-55'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="grid h-9 w-9 place-items-center rounded-2xl bg-white/[0.05] text-[18px]">
                      {achievement.unlocked ? achievement.icon : '🔒'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-bold text-white">{achievement.name}</span>
                        <span className={`rounded-full !px-2 !py-0.5 text-[10px] font-bold ${RARITY_COLORS[achievement.rarity]}`}>
                          {achievement.rarity}
                        </span>
                      </div>
                      <div className="!mt-1 text-[12px] text-[#8e9ca6]">{achievement.description}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </PetPanel> */}

      {/* <PetPanel title="宠物回忆" icon={<Award size={15} />}>
        <div className="grid gap-3">
          {highlightedMemories.map((memory) => (
            <div key={memory.id} className="rounded-2xl border border-white/8 bg-black/25 !px-4 !py-3">
              <div className="flex items-start gap-3">
                <div className="grid h-9 w-9 place-items-center rounded-2xl bg-white/[0.05] text-[18px]">{memory.icon}</div>
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-bold text-white">{memory.title}</div>
                  <div className="!mt-1 text-[12px] leading-5 text-[#8e9ca6]">{memory.description}</div>
                  <div className="!mt-2 text-[11px] text-[#70808a]">{memory.time}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </PetPanel> */}
      </>
      )}

      {/* <PetPanel title="当前宠物焦点" icon={<MessageCircle size={15} />}>
        <div className="rounded-2xl border border-emerald-400/10 bg-emerald-400/[0.05] !px-4 !py-4">
          <div className="text-[12px] font-bold text-emerald-300">今日优先事项</div>
          <div className="!mt-2 text-[15px] font-bold text-white">{nextTask?.title ?? '和龟仙人多聊聊'}</div>
          <p className="!mt-2 text-[12px] leading-6 text-[#9cb3a6]">
            {nextTask?.description ?? '宠物最近状态不错，适合继续推进预测、社区互动和皮肤收集。'}
          </p>
          <div className="!mt-3 flex flex-wrap gap-2 text-[11px] text-[#bfd5c8]">
            <span className="rounded-full bg-white/[0.05] !px-3 !py-1">装备皮肤：{equippedSkin?.name ?? '未选择'}</span>
            <span className="rounded-full bg-white/[0.05] !px-3 !py-1">主动技能：{activeSkills.length} 个</span>
            <span className="rounded-full bg-white/[0.05] !px-3 !py-1">状态：{pet.status}</span>
          </div>
        </div>
      </PetPanel> */}
    </div>
  );
};
