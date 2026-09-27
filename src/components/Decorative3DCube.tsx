import React, { useState, useRef } from 'react';

interface Decorative3DCubeProps {
  size?: number; // size in pixels, e.g. 36
  className?: string;
}

export const Decorative3DCube: React.FC<Decorative3DCubeProps> = ({
  size = 36,
  className = '',
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [interactiveRot, setInteractiveRot] = useState<{ x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const half = size / 2;

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    // Map to angles
    setInteractiveRot({
      x: -y * 0.8,
      y: x * 0.8,
    });
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setInteractiveRot(null);
  };

  return (
    <div
      ref={containerRef}
      onMouseEnter={handleMouseEnter}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`relative select-none cursor-pointer flex items-center justify-center ${className}`}
      style={{
        width: `${size + 14}px`,
        height: `${size + 14}px`,
        perspective: '400px',
      }}
      title="3D Capshot Core (Subtle kinetic ambient element)"
      aria-label="3D decorative cube"
    >
      {/* 3D Scene / Cube Container */}
      <div
        className={`relative transition-transform ${isHovered ? 'duration-150' : 'duration-700 ease-out'}`}
        style={{
          width: `${size}px`,
          height: `${size}px`,
          transformStyle: 'preserve-3d',
          transform: interactiveRot
            ? `rotateX(${25 + interactiveRot.x}deg) rotateY(${35 + interactiveRot.y}deg)`
            : undefined,
          animation: !interactiveRot ? 'capshot-cube-rotate 18s linear infinite' : 'none',
        }}
      >
        {/* Front Face: Hot Pink with C */}
        <div
          className="absolute inset-0 flex items-center justify-center font-bold text-white rounded-lg border border-white/30 backdrop-blur-xs shadow-inner"
          style={{
            transform: `translateZ(${half}px)`,
            background: 'linear-gradient(135deg, #FF2E63, #E01E50)',
            boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.4)',
          }}
        >
          <span className="text-xs font-heading font-black tracking-tight drop-shadow-sm">C</span>
        </div>

        {/* Back Face: Deep Navy with Dot Grid */}
        <div
          className="absolute inset-0 flex items-center justify-center text-white/80 rounded-lg border border-white/10 shadow-inner"
          style={{
            transform: `rotateY(180deg) translateZ(${half}px)`,
            background: '#151922',
          }}
        >
          <span className="text-[10px] font-mono text-pink-400/90 font-bold">#</span>
        </div>

        {/* Right Face: Soft Yellow / Amber */}
        <div
          className="absolute inset-0 flex items-center justify-center text-[#78350F] rounded-lg border border-yellow-200/40 shadow-inner"
          style={{
            transform: `rotateY(90deg) translateZ(${half}px)`,
            background: 'linear-gradient(135deg, #FEF08A, #FDE047)',
          }}
        >
          <span className="text-[10px]">✨</span>
        </div>

        {/* Left Face: Translucent Frosted Glass */}
        <div
          className="absolute inset-0 flex items-center justify-center text-white/90 rounded-lg border border-white/20 shadow-inner"
          style={{
            transform: `rotateY(-90deg) translateZ(${half}px)`,
            background: 'linear-gradient(135deg, rgba(255, 46, 99, 0.75), rgba(21, 25, 34, 0.85))',
            backdropFilter: 'blur(4px)',
          }}
        >
          <span className="text-[9px] font-bold tracking-wider">AI</span>
        </div>

        {/* Top Face: Light Reflective Surface */}
        <div
          className="absolute inset-0 flex items-center justify-center text-white rounded-lg border border-white/40 shadow-inner"
          style={{
            transform: `rotateX(90deg) translateZ(${half}px)`,
            background: 'linear-gradient(180deg, rgba(255,255,255,0.85), rgba(254, 240, 138, 0.7))',
          }}
        >
          <div className="w-1.5 h-1.5 rounded-full bg-[#FF2E63]/80 animate-ping" />
        </div>

        {/* Bottom Face: Deep Ambient Shadow Occlusion */}
        <div
          className="absolute inset-0 rounded-lg"
          style={{
            transform: `rotateX(-90deg) translateZ(${half}px)`,
            background: 'rgba(10, 12, 16, 0.85)',
          }}
        />
      </div>

      {/* Ground plane soft drop shadow for physical 3D contact */}
      <div
        className="absolute -bottom-2 pointer-events-none rounded-full blur-[3px] transition-all duration-300"
        style={{
          width: `${size * 0.9}px`,
          height: '6px',
          background: isHovered
            ? 'radial-gradient(ellipse at center, rgba(255, 46, 99, 0.4) 0%, transparent 70%)'
            : 'radial-gradient(ellipse at center, rgba(21, 25, 34, 0.25) 0%, transparent 70%)',
          transform: isHovered ? 'scale(1.2)' : 'scale(1)',
        }}
      />
    </div>
  );
};
