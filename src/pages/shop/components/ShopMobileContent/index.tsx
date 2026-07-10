/** 文件说明：黑市手机端内容区（奖池概率、预览、体力商店、已拥有龟种）。 */
import { motion } from 'framer-motion';
import { Coins, Heart } from 'lucide-react';
import type { OwnedPetItem } from '@/hooks/petTypes';
import { PetAssetPreview } from '@/components/common/pet/PetAssetPreview';
import { resolvePetPreviewAsset } from '@/components/common/pet/petPreviewAsset';
import { normalizePetRarityGrade } from '@/components/common/pet/petRarity';
import { TextEmptyState } from '@/components/common/state/PageState';
import type { ShopItem } from '../shopTypes';
import { PetPoolPreviewTile } from '../PetPoolPreviewTile';
import {
  ShopSharedSpineStrip,
  type ShopSharedSpineSlot,
} from '../ShopSharedSpineStrip';
import styles from './index.module.scss';

const SHOP_BTN_GREEN = '/shop/btn-g.png';

function css(...classNames: Array<string | false | null | undefined>) {
  return classNames
    .filter(Boolean)
    .flatMap((className) => String(className).split(/\s+/))
    .filter(Boolean)
    .map((className) => styles[className] ?? className)
    .join(' ');
}

function toneClass(grade: string) {
  const key = grade.toLowerCase();
  if (key === 'sss' || key === 'ss' || key === 's') return css(`tone-${key}`);
  if (key === 'a') return css('tone-a');
  if (key === 'b') return css('tone-b');
  return css('tone-c');
}

function probCellClass(grade: string) {
  const key = grade.toLowerCase();
  if (key === 'sss' || key === 'ss' || key === 's') return css(`prob-${key}`, toneClass(grade));
  if (key === 'a') return css('prob-a', toneClass(grade));
  if (key === 'b') return css('prob-b', toneClass(grade));
  return css('prob-c', toneClass(grade));
}

export type ShopProbabilityRow = {
  label: string;
  value: string;
  icon: string;
  tone: string;
};

export type ShopPoolPreviewRow = {
  key: string;
  petKey: string;
  label: string;
  rarityGrade: ReturnType<typeof normalizePetRarityGrade>;
  preview: ReturnType<typeof resolvePetPreviewAsset>;
};

interface ShopMobileContentProps {
  petStamina: number;
  petMaxStamina: number;
  probabilityRows: ShopProbabilityRow[];
  petPoolPreviewRows: ShopPoolPreviewRow[];
  poolPreviewSlots: Array<ShopSharedSpineSlot | null>;
  firstStaminaItem: ShopItem | undefined;
  appleImage: string;
  applePrice: number;
  appleRecovery: number;
  buyFlashId: string | null;
  ownedPetList: OwnedPetItem[];
  resolveOwnedPetSource: (petItem: OwnedPetItem) => {
    avatarUrl?: string;
    petKey?: string;
    petName?: string;
  };
  onOpenPreviewDialog: () => void;
  onOpenAppleBuy: () => void;
}

export function ShopMobileContent({
  petStamina,
  petMaxStamina,
  probabilityRows,
  petPoolPreviewRows,
  poolPreviewSlots,
  firstStaminaItem,
  appleImage,
  applePrice,
  appleRecovery,
  buyFlashId,
  ownedPetList,
  resolveOwnedPetSource,
  onOpenPreviewDialog,
  onOpenAppleBuy,
}: ShopMobileContentProps) {
  return (
    <div className={css('root')}>
      <section className={css('card')}>
        <div className={css('sectionHead')}>
          <h2 className={css('sectionTitle')}>奖池概率</h2>
          <span className={css('sectionHint')}>保底继承 · 今日奖池</span>
        </div>
        <div className={css('probGrid')}>
          {probabilityRows.length > 0 ? (
            probabilityRows.map((item) => (
              <div key={item.label} className={`${css('probCell')} ${probCellClass(item.label)}`}>
                <img src={item.icon} alt="" className={css('probIcon')} />
                <span className={css('probGrade')}>{item.label}</span>
                <span className={css('probValue')}>{item.value}</span>
              </div>
            ))
          ) : (
            <TextEmptyState text="暂无概率数据" className={`${css('empty')} col-span-3`} />
          )}
        </div>

        <div className={css('sectionHead')} style={{ marginTop: 16 }}>
          <h2 className={css('sectionTitle')}>奖池预览</h2>
          <button type="button" className={css('linkBtn')} onClick={onOpenPreviewDialog}>
            全部预览 &gt;
          </button>
        </div>
        <div className={css('previewTrack')}>
          {petPoolPreviewRows.length > 0 ? (
            <div className={css('previewStrip')}>
              <ShopSharedSpineStrip
                slots={poolPreviewSlots}
                columnWidth={76}
                previewWidth={40}
                previewHeight={40}
                gap={8}
                previewTopPx={28}
              >
              {petPoolPreviewRows.map((item) => (
                <PetPoolPreviewTile
                  key={`m-${item.key}`}
                  variant="strip"
                  useSharedSpine
                  rarityGrade={item.rarityGrade}
                  label={item.label}
                  petKey={item.petKey}
                  preview={item.preview}
                />
              ))}
            </ShopSharedSpineStrip>
            </div>
          ) : (
            <TextEmptyState text="暂无预览数据" className={css('empty')} />
          )}
        </div>
      </section>

      <section className={css('card')}>
        <div className={`${css('sectionHead')} ${css('staminaHead')}`}>
          <h2 className={css('sectionTitle')}>体力商店</h2>
          <span className={css('staminaPill')}>
            <Heart size={12} strokeWidth={2.3} aria-hidden />
            {petStamina}/{petMaxStamina}
          </span>
        </div>
        {firstStaminaItem ? (
          <div className={css('staminaRow')}>
            {buyFlashId === firstStaminaItem.id ? (
              <motion.div
                initial={{ opacity: 0.5 }}
                animate={{ opacity: 0 }}
                transition={{ duration: 0.6 }}
                className={css('buyFlash')}
              />
            ) : null}
            <img src={appleImage} alt="小苹果" className={css('staminaIcon')} />
            <div className={css('staminaCopy')}>
              <div className={css('staminaName')}>小苹果</div>
              <div className={css('staminaDesc')}>恢复 {appleRecovery} 点体力</div>
              <span className={css('staminaPrice')}>
                <Coins size={12} className="text-amber-300" aria-hidden />
                {applePrice}
              </span>
            </div>
            <button type="button" className={css('buyBtn')} onClick={onOpenAppleBuy}>
              <img src={SHOP_BTN_GREEN} alt="" className={css('buyBtnImg')} aria-hidden />
              <span className={css('buyBtnText')}>购买</span>
            </button>
          </div>
        ) : null}
      </section>

      <section className={css('card')}>
        <h2 className={css('ownedTitle')}>已拥有龟种 ({ownedPetList.length})</h2>
        {ownedPetList.length > 0 ? (
          <div className={css('ownedList')}>
            {ownedPetList.map((petItem) => {
              const ownedSource = resolveOwnedPetSource(petItem);
              const rarity = normalizePetRarityGrade(petItem.rarity);
              const isEquipped = Boolean(petItem.isEquipped);

              return (
                <article
                  key={String(petItem.petId)}
                  className={`${css('ownedRow')} ${isEquipped ? css('ownedRowEquipped') : ''}`}
                >
                  <div className={css('ownedPreview')}>
                    <PetAssetPreview
                      {...ownedSource}
                      size={44}
                      deferSpineMount
                      className="mx-auto"
                      imageClassName="object-contain"
                    />
                  </div>
                  <div className={css('ownedCopy')}>
                    <div className={css('ownedName')}>{petItem.petName ?? petItem.petKey ?? `宠物 ${petItem.petId}`}</div>
                    <div className={`${css('ownedMeta')} ${isEquipped ? css('ownedMetaEquipped') : ''}`}>
                      {rarity} 级{isEquipped ? ' · 已装备' : ''}
                    </div>
                  </div>
                  <span className={`${css('equippedBtn')} ${isEquipped ? '' : css('equippedBtnGhost')}`}>
                    {isEquipped ? '已装备' : rarity}
                  </span>
                </article>
              );
            })}
          </div>
        ) : (
          <TextEmptyState text="暂无已拥有龟种" className={css('empty')} />
        )}
      </section>
    </div>
  );
}
