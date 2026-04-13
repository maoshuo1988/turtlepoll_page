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
