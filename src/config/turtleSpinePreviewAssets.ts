/** 文件说明：public/spine/01-10 乌龟骨骼预览资源配置。 */

export type TurtleSpinePreviewItem = {
  id: string;
  label: string;
  skeletonUrl: string;
  atlasUrl: string;
};

export const TURTLE_SPINE_PREVIEW_ITEMS: TurtleSpinePreviewItem[] = Array.from({ length: 10 }, (_, index) => {
  const id = String(index + 7).padStart(2, '0');
  const fileName = `turtle${id}`;
  return {
    id,
    label: id,
    skeletonUrl: `/spine/${id}/${fileName}.json`,
    atlasUrl: `/spine/${id}/${fileName}.atlas`,
  };
});
