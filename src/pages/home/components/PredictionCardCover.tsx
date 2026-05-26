/**
 * 文件说明：暗盘预测卡片封面，无封面时左右拼接 sideA/sideB 背景图。
 */
import {
  PREDICTION_CARD_FALLBACK_IMAGE,
  type PredictionCardItem,
} from './predictionCards';

type PredictionCoverItem = Pick<
  PredictionCardItem,
  'cover' | 'listImage' | 'image' | 'sideABgImage' | 'sideBBgImage' | 'sideABgColor' | 'sideBBgColor'
>;

interface PredictionCardCoverProps {
  item: PredictionCoverItem;
  className?: string;
  imageClassName?: string;
  loading?: 'eager' | 'lazy';
}

function resolveCoverImage(item: PredictionCoverItem) {
  return item.cover?.trim() || item.listImage?.trim() || '';
}

export function PredictionCardCover({
  item,
  className = 'absolute inset-0',
  imageClassName = 'h-full w-full object-cover',
  loading = 'lazy',
}: PredictionCardCoverProps) {
  const coverImage = resolveCoverImage(item);
  const sideAImage = item.sideABgImage?.trim();
  const sideBImage = item.sideBBgImage?.trim();
  const sideAColor = item.sideABgColor?.trim() || '#0f766e';
  const sideBColor = item.sideBBgColor?.trim() || '#be123c';

  if (coverImage) {
    return <img src={coverImage} alt="" className={`${className} ${imageClassName}`} loading={loading} />;
  }

  if (sideAImage || sideBImage) {
    return (
      <div className={`${className} grid grid-cols-2`}>
        <div className="relative h-full overflow-hidden">
          {sideAImage ? (
            <img src={sideAImage} alt="" className={imageClassName} loading={loading} />
          ) : (
            <div className="h-full w-full" style={{ backgroundColor: sideAColor }} />
          )}
        </div>
        <div className="relative h-full overflow-hidden border-l border-white/15">
          {sideBImage ? (
            <img src={sideBImage} alt="" className={imageClassName} loading={loading} />
          ) : (
            <div className="h-full w-full" style={{ backgroundColor: sideBColor }} />
          )}
        </div>
      </div>
    );
  }

  return (
    <img
      src={item.image?.trim() || PREDICTION_CARD_FALLBACK_IMAGE}
      alt=""
      className={`${className} ${imageClassName}`}
      loading={loading}
    />
  );
}
