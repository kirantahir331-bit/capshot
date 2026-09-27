import React, { useRef, useState, useEffect } from 'react';

interface TiltWrapperProps {
  children: React.ReactNode;
  className?: string;
  maxTilt?: number; // Maximum rotation in degrees (default 3.5)
  disabled?: boolean;
}

export const TiltWrapper: React.FC<TiltWrapperProps> = ({
  children,
  className = '',
  maxTilt = 3.5,
  disabled = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<React.CSSProperties>({});
  const [isHovered, setIsHovered] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    // Check if device is touch-primary (skip tilt on touch devices)
    const checkTouch = () => {
      const isTouch =
        !window.matchMedia('(hover: hover) and (pointer: fine)').matches ||
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0;
      setIsTouchDevice(isTouch);
    };

    checkTouch();
    window.addEventListener('resize', checkTouch);
    return () => window.removeEventListener('resize', checkTouch);
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (disabled || isTouchDevice || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left; // x position within element
    const y = e.clientY - rect.top; // y position within element

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    // Normalized to -1 .. 1
    const normalizedX = (x - centerX) / centerX;
    const normalizedY = (y - centerY) / centerY;

    // Calculate rotation
    const rotateX = -normalizedY * maxTilt;
    const rotateY = normalizedX * maxTilt;

    setStyle({
      transform: `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) scale3d(1.008, 1.008, 1.008)`,
      transition: 'transform 0.08s ease-out',
      willChange: 'transform',
    });
  };

  const handleMouseEnter = () => {
    if (disabled || isTouchDevice) return;
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    if (disabled || isTouchDevice) return;
    setIsHovered(false);
    setStyle({
      transform: 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)',
      transition: 'transform 0.45s cubic-bezier(0.2, 0.8, 0.2, 1)',
    });
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        transformStyle: 'preserve-3d',
        ...style,
      }}
      className={`relative transition-shadow duration-300 ${className}`}
    >
      {children}
    </div>
  );
};
