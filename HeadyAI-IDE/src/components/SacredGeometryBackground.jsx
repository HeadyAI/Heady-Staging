// HEADY_BRAND:BEGIN
// ╔══════════════════════════════════════════════════════════════════╗
// ║  ██╗  ██╗███████╗ █████╗ ██████╗ ██╗   ██╗                     ║
// ║  ██║  ██║██╔════╝██╔══██╗██╔══██╗╚██╗ ██╔╝                     ║
// ║  ███████║█████╗  ███████║██║  ██║ ╚████╔╝                      ║
// ║  ██╔══██║██╔══╝  ██╔══██║██║  ██║  ╚██╔╝                       ║
// ║  ██║  ██║███████╗██║  ██║██████╔╝   ██║                        ║
// ║  ╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚═════╝    ╚═╝                        ║
// ║                                                                  ║
// ║  ∞ SACRED GEOMETRY ∞  Organic Systems · Breathing Interfaces    ║
// ║  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  ║
// ║  FILE: HeadyAI-IDE/src/components/SacredGeometryBackground.jsx   ║
// ║  LAYER: frontend/src/components                                 ║
// ╚══════════════════════════════════════════════════════════════════╝
// HEADY_BRAND:END

import React, { useEffect, useRef } from 'react';

const SacredGeometryBackground = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let animationId;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Flower of Life pattern animation
    let time = 0;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Set up for sacred geometry
      ctx.globalAlpha = 0.1;
      ctx.strokeStyle = '#6366f1';
      ctx.lineWidth = 1;

      // Draw Flower of Life pattern
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const radius = 30;
      const rows = 7;
      const cols = 7;

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const x = centerX + (col - cols / 2) * radius * 1.5;
          const y = centerY + (row - rows / 2) * radius * Math.sqrt(3);
          
          // Animated circles
          const animatedRadius = radius + Math.sin(time + row * 0.1 + col * 0.1) * 5;
          
          ctx.beginPath();
          ctx.arc(x, y, animatedRadius, 0, Math.PI * 2);
          ctx.stroke();
        }
      }

      // Draw Metatron's Cube overlay
      ctx.globalAlpha = 0.05;
      ctx.strokeStyle = '#8b5cf6';
      
      const metatronSize = 200;
      const metatronX = centerX - metatronSize / 2;
      const metatronY = centerY - metatronSize / 2;
      
      // Draw hexagon
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i + time * 0.001;
        const x = centerX + Math.cos(angle) * metatronSize / 2;
        const y = centerY + Math.sin(angle) * metatronSize / 2;
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.closePath();
      ctx.stroke();

      time += 0.01;
      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="sacred-geometry-background"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: -1,
        pointerEvents: 'none'
      }}
    />
  );
};

export default SacredGeometryBackground;
