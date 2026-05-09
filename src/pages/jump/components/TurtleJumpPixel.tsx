/**
 * 文件说明：Turtle Jump Pixel，实验室小游戏页面组件。
 */
import React from 'react';
import { TurtleDivePixel as LegacyTurtleJumpPixel } from './LegacyTurtleJumpPixel';

interface TurtleJumpPixelProps {
  onBack?: () => void;
  mobileMode?: boolean;
}

export const TurtleJumpPixel: React.FC<TurtleJumpPixelProps> = ({
  onBack,
  mobileMode = false,
}) => (
  <LegacyTurtleJumpPixel
    onBack={onBack ?? (() => undefined)}
    mobileMode={mobileMode}
  />
);
