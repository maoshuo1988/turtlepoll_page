import React from 'react';

interface LegacyModuleProps {
  src: string;
}

export const LegacyModule: React.FC<LegacyModuleProps> = ({ src }) => {
  return (
    <div className="w-full h-[calc(100vh-56px)] overflow-hidden">
      <iframe
        title="legacy-module"
        src={src}
        className="w-full h-full border-0 bg-white"
      />
    </div>
  );
};

