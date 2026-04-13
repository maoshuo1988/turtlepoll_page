import React from 'react';
import { Lab } from './Lab';

interface TurtleJumpPixelProps {
  onBack?: () => void;
}

export const TurtleJumpPixel: React.FC<TurtleJumpPixelProps> = ({
  onBack,
}) => <Lab onBack={onBack ?? (() => undefined)} />;
