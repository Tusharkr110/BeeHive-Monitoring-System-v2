import React, { useEffect, useState, useRef } from 'react';

const HoneybeeCursor = () => {
  const [position, setPosition] = useState({ x: -100, y: -100 });
  const [trail, setTrail] = useState([]);
  const [clicks, setClicks] = useState([]);
  const [isHovered, setIsHovered] = useState(false);
  const targetPos = useRef({ x: -100, y: -100 });
  const currentPos = useRef({ x: -100, y: -100 });
  const requestRef = useRef();

  useEffect(() => {
    const handleMouseMove = (e) => {
      targetPos.current = { x: e.clientX, y: e.clientY };

      // Check if hovering over interactive element
      const target = e.target;
      const isInteractive = target.closest('button, a, select, input, .bento-card, .sidebar-link');
      setIsHovered(!!isInteractive);

      // Add trail particle
      if (Math.random() > 0.4) {
        setTrail((prev) => [
          ...prev.slice(-12),
          {
            id: Date.now() + Math.random(),
            x: e.clientX + (Math.random() * 8 - 4),
            y: e.clientY + 12 + (Math.random() * 6),
            size: Math.random() * 4 + 3,
            opacity: 0.8
          }
        ]);
      }
    };

    const handleClick = (e) => {
      // Pollen Splash Burst on click
      const newParticles = Array.from({ length: 6 }).map((_, i) => ({
        id: Date.now() + i,
        x: e.clientX,
        y: e.clientY,
        angle: (i * 60 * Math.PI) / 180,
        speed: Math.random() * 4 + 2,
        size: Math.random() * 5 + 4
      }));
      setClicks((prev) => [...prev.slice(-12), ...newParticles]);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('click', handleClick);

    // Smooth Lerp animation loop for elastic bee flight
    const animate = () => {
      currentPos.current.x += (targetPos.current.x - currentPos.current.x) * 0.22;
      currentPos.current.y += (targetPos.current.y - currentPos.current.y) * 0.22;
      setPosition({ x: currentPos.current.x, y: currentPos.current.y });
      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('click', handleClick);
      cancelAnimationFrame(requestRef.current);
    };
  }, []);

  // Cleanup old trail particles
  useEffect(() => {
    const interval = setInterval(() => {
      setTrail((prev) => prev.filter((p) => Date.now() - p.id < 600));
      setClicks((prev) => prev.filter((p) => Date.now() - p.id < 500));
    }, 100);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9999, overflow: 'hidden' }}>
      <style>{`
        @keyframes beeWings {
          0%, 100% { transform: scaleY(1) rotate(-15deg); }
          50% { transform: scaleY(0.4) rotate(-5deg); }
        }
        @keyframes nectarFade {
          0% { transform: scale(1); opacity: 0.8; }
          100% { transform: scale(0.2) translateY(12px); opacity: 0; }
        }
        @keyframes splashBurst {
          0% { transform: translate(0,0) scale(1); opacity: 1; }
          100% { transform: translate(var(--dx), var(--dy)) scale(0); opacity: 0; }
        }
      `}</style>

      {/* Honey Nectar Particle Trail */}
      {trail.map((p) => (
        <div
          key={p.id}
          style={{
            position: 'absolute',
            left: `${p.x}px`,
            top: `${p.y}px`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            borderRadius: '50%',
            background: 'radial-gradient(circle, #fbbf24 0%, #d97706 100%)',
            boxShadow: '0 0 6px rgba(251, 191, 36, 0.8)',
            animation: 'nectarFade 0.6s ease-out forwards'
          }}
        />
      ))}

      {/* Click Pollen Splash Burst */}
      {clicks.map((p) => {
        const dx = Math.cos(p.angle) * p.speed * 12;
        const dy = Math.sin(p.angle) * p.speed * 12;
        return (
          <div
            key={p.id}
            style={{
              position: 'absolute',
              left: `${p.x}px`,
              top: `${p.y}px`,
              width: `${p.size}px`,
              height: `${p.size}px`,
              borderRadius: '50%',
              background: '#22d3ee',
              boxShadow: '0 0 8px #22d3ee',
              '--dx': `${dx}px`,
              '--dy': `${dy}px`,
              animation: 'splashBurst 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards'
            }}
          />
        );
      })}

      {/* Dynamic Honeybee Sprite */}
      <div
        style={{
          position: 'absolute',
          left: `${position.x}px`,
          top: `${position.y}px`,
          transform: `translate(-50%, -50%) scale(${isHovered ? 1.25 : 1.0})`,
          transition: 'transform 0.15s ease-out',
          filter: isHovered ? 'drop-shadow(0 0 10px rgba(34, 211, 238, 0.9))' : 'drop-shadow(0 2px 6px rgba(0,0,0,0.3))'
        }}
      >
        <svg width="34" height="34" viewBox="0 0 34 34">
          {/* Animated Wings */}
          <ellipse
            cx="10"
            cy="9"
            rx="5"
            ry="8"
            fill="rgba(255,255,255,0.85)"
            stroke="#38bdf8"
            strokeWidth="1"
            style={{ animation: 'beeWings 0.12s infinite ease-in-out' }}
          />
          <ellipse
            cx="20"
            cy="9"
            rx="5"
            ry="8"
            fill="rgba(255,255,255,0.85)"
            stroke="#38bdf8"
            strokeWidth="1"
            style={{ animation: 'beeWings 0.12s infinite ease-in-out reverse' }}
          />

          {/* Bee Body */}
          <ellipse cx="15" cy="19" rx="8.5" ry="10.5" fill="#f59e0b" stroke="#78350f" strokeWidth="1.5" />

          {/* Body Stripes */}
          <path d="M7 16 C11 18 19 18 23 16" stroke="#1e293b" strokeWidth="2.8" fill="none" strokeLinecap="round" />
          <path d="M8 20 C12 22 18 22 22 20" stroke="#1e293b" strokeWidth="2.8" fill="none" strokeLinecap="round" />
          <path d="M10 24 C13 25 17 25 20 24" stroke="#1e293b" strokeWidth="2.2" fill="none" strokeLinecap="round" />

          {/* Antennae */}
          <path d="M12 10 Q10 5 8 6 M18 10 Q20 5 22 6" stroke="#1e293b" strokeWidth="1.5" strokeLinecap="round" fill="none" />

          {/* Eyes */}
          <circle cx="12" cy="12" r="1.3" fill="#0f172a" />
          <circle cx="18" cy="12" r="1.3" fill="#0f172a" />

          {/* Pollen Stinger Glow if hovered */}
          {isHovered && <circle cx="15" cy="28" r="2.5" fill="#22d3ee" className="pulse-glow" />}
        </svg>
      </div>
    </div>
  );
};

export default HoneybeeCursor;
