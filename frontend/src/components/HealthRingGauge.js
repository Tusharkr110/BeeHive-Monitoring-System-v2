import React, { useState } from 'react';

// ── 1. 3D Liquid Bio-Sphere ──
const BioSphereGauge = ({ score }) => {
  let color = '#22c55e', topColor = '#4ade80', glow = 'rgba(34, 197, 94, 0.35)', label = 'COLONY OPTIMAL';
  if (score < 50) { color = '#ef4444'; topColor = '#f87171'; glow = 'rgba(239, 68, 68, 0.35)'; label = 'CRITICAL STATE'; }
  else if (score < 80) { color = '#eab308'; topColor = '#fbbf24'; glow = 'rgba(234, 179, 8, 0.35)'; label = 'ATTENTION REQUIRED'; }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '12px 0' }}>
      <div style={{
        position: 'relative', width: '150px', height: '150px', borderRadius: '50%',
        background: 'var(--bg-surface)', border: `2px solid ${color}40`,
        boxShadow: `0 0 24px ${glow}, inset 0 0 20px rgba(0,0,0,0.5)`, overflow: 'hidden',
        display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}>
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: `${score}%`,
          background: `linear-gradient(180deg, ${topColor} 0%, ${color} 100%)`,
          transition: 'height 0.8s cubic-bezier(0.16, 1, 0.3, 1)', opacity: 0.85
        }} />
        <div style={{
          position: 'absolute', top: '6px', left: '16px', right: '16px', height: '40px',
          borderRadius: '50%', background: 'linear-gradient(180deg, rgba(255,255,255,0.25) 0%, transparent 100%)',
          pointerEvents: 'none', zIndex: 5
        }} />
        <div style={{ position: 'relative', zIndex: 10, textAlign: 'center', filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.8))' }}>
          <div style={{ fontSize: '32px', fontWeight: '900', color: '#ffffff', lineHeight: 1 }}>{score}<span style={{ fontSize: '16px', marginLeft: 1 }}>%</span></div>
          <div style={{ fontSize: '9px', fontWeight: '800', color: 'rgba(255,255,255,0.85)', letterSpacing: '1px', marginTop: 2 }}>HEALTH INDEX</div>
        </div>
      </div>
      <div style={{ fontSize: '10px', fontWeight: '800', color, background: `${color}15`, border: `1px solid ${color}30`, padding: '4px 12px', borderRadius: '20px', letterSpacing: '1px', marginTop: 12 }}>{label}</div>
    </div>
  );
};

// ── 2. Honeycomb Cell Matrix ──
const HoneycombGauge = ({ score }) => {
  let color = '#22c55e', label = 'EXCELLENT';
  if (score < 50) { color = '#ef4444'; label = 'CRITICAL'; }
  else if (score < 80) { color = '#eab308'; label = 'ATTENTION'; }

  const hexes = [
    { x: 0, y: 0, m: 1 },
    { x: 0, y: -42, tag: 'TEMP' },
    { x: 37, y: -21, tag: 'HUM' },
    { x: 37, y: 21, tag: 'SOUND' },
    { x: 0, y: 42, tag: 'VIB' },
    { x: -37, y: 21, tag: 'AI' },
    { x: -37, y: -21, tag: 'SMS' },
  ];
  const activeCount = Math.max(1, Math.ceil((score / 100) * 7));

  const getPts = (cx, cy, r) => Array.from({length:6}, (_,i) => {
    const a = (Math.PI/180)*(60*i - 30);
    return `${cx + r*Math.cos(a)},${cy + r*Math.sin(a)}`;
  }).join(' ');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '12px 0' }}>
      <div style={{ position: 'relative', width: '170px', height: '170px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="170" height="170" viewBox="-70 -70 140 140" style={{ overflow: 'visible' }}>
          {hexes.map((c, i) => {
            const active = i < activeCount;
            const r = c.m ? 24 : 18;
            return (
              <g key={i} transform={`translate(${c.x}, ${c.y})`}>
                <polygon points={getPts(0, 0, r)}
                  fill={c.m ? 'var(--bg-raised)' : active ? `${color}28` : 'var(--bg-surface)'}
                  stroke={active ? color : 'var(--border-default)'} strokeWidth={c.m ? 2.5 : active ? 1.8 : 1}
                  style={{ transition: 'all 0.4s' }} />
                {!c.m && (
                  <text
                    x="0" y="3.5"
                    textAnchor="middle"
                    fill={active ? 'var(--text-primary)' : 'var(--text-muted)'}
                    fontSize="8"
                    fontWeight="800"
                    fontFamily="var(--font)"
                    letterSpacing="0.4px"
                  >
                    {c.tag}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
        <div style={{ position: 'absolute', textAlign: 'center', zIndex: 10, pointerEvents: 'none' }}>
          <div style={{ fontSize: '26px', fontWeight: '900', color: '#ffffff', textShadow: '0 2px 8px rgba(0,0,0,0.8)' }}>
            {score}<span style={{ fontSize: '14px', fontWeight: '700', color: '#ffffff', marginLeft: '1px' }}>%</span>
          </div>
        </div>
      </div>
      <div style={{ fontSize: '10px', fontWeight: '800', color, background: `${color}15`, border: `1px solid ${color}30`, padding: '3px 12px', borderRadius: '20px', letterSpacing: '1px', marginTop: 6 }}>{label} HIVE MATRIX</div>
    </div>
  );
};

// ── 3. Cyberpunk Reactor Core ──
const CyberReactorGauge = ({ score }) => {
  let color = '#22c55e', label = 'CORE NOMINAL';
  if (score < 50) { color = '#ef4444'; label = 'CORE FAILURE'; }
  else if (score < 80) { color = '#eab308'; label = 'CORE STRESS'; }

  const r = 68, c = 2 * Math.PI * r, off = c - (score/100)*c;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '10px 0' }}>
      <div style={{ position: 'relative', width: '170px', height: '170px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="170" height="170" viewBox="0 0 170 170" style={{ overflow: 'visible' }}>
          <circle cx="85" cy="85" r="78" fill="none" stroke="var(--cyan-400)" strokeWidth="1" strokeDasharray="3 6" opacity="0.4" />
          <circle cx="85" cy="85" r={r} fill="none" stroke="var(--bg-overlay)" strokeWidth="8" />
          <circle cx="85" cy="85" r={r} fill="none" stroke={color} strokeWidth="8"
            strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round"
            style={{ transform: 'rotate(-90deg)', transformOrigin: '85px 85px', transition: 'stroke-dashoffset 0.8s' }} />
        </svg>
        <div style={{ position: 'absolute', textAlign: 'center' }}>
          <div style={{ fontSize: '10px', color: 'var(--text-muted)', letterSpacing: '1px' }}>REACTOR</div>
          <div style={{ fontSize: '32px', fontWeight: '900', color: 'var(--text-primary)', lineHeight: 1 }}>{score}<span style={{ fontSize: '16px', color }}>%</span></div>
        </div>
      </div>
      <div style={{ fontSize: '10px', fontWeight: '800', color, background: `${color}15`, border: `1px solid ${color}30`, padding: '3px 12px', borderRadius: '20px', letterSpacing: '1px' }}>{label}</div>
    </div>
  );
};

// ── 4. Smart Activity Rings ──
const SmartRingsGauge = ({ score }) => {
  let color = '#22c55e';
  if (score < 50) color = '#ef4444';
  else if (score < 80) color = '#eab308';

  const r1 = 68, c1 = 2 * Math.PI * r1, off1 = c1 - (score/100)*c1;
  const r2 = 54, c2 = 2 * Math.PI * r2, off2 = c2 - 0.85*c2;
  const r3 = 40, c3 = 2 * Math.PI * r3, off3 = c3 - 0.72*c3;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '10px 0' }}>
      <div style={{ position: 'relative', width: '170px', height: '170px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <svg width="170" height="170" viewBox="0 0 170 170">
          <circle cx="85" cy="85" r={r1} fill="none" stroke={`${color}20`} strokeWidth="7" />
          <circle cx="85" cy="85" r={r1} fill="none" stroke={color} strokeWidth="7" strokeDasharray={c1} strokeDashoffset={off1} strokeLinecap="round" style={{ transform: 'rotate(-90deg)', transformOrigin: '85px 85px', transition: 'stroke-dashoffset 0.8s' }} />

          <circle cx="85" cy="85" r={r2} fill="none" stroke="rgba(34,211,238,0.2)" strokeWidth="7" />
          <circle cx="85" cy="85" r={r2} fill="none" stroke="#22d3ee" strokeWidth="7" strokeDasharray={c2} strokeDashoffset={off2} strokeLinecap="round" style={{ transform: 'rotate(-90deg)', transformOrigin: '85px 85px' }} />

          <circle cx="85" cy="85" r={r3} fill="none" stroke="rgba(167,139,250,0.2)" strokeWidth="7" />
          <circle cx="85" cy="85" r={r3} fill="none" stroke="#a78bfa" strokeWidth="7" strokeDasharray={c3} strokeDashoffset={off3} strokeLinecap="round" style={{ transform: 'rotate(-90deg)', transformOrigin: '85px 85px' }} />
        </svg>
        <div style={{ position: 'absolute', textAlign: 'center' }}>
          <div style={{ fontSize: '28px', fontWeight: '900', color: 'var(--text-primary)' }}>{score}<span style={{ fontSize: '14px', color }}>%</span></div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: '8px', fontSize: '10px', color: 'var(--text-muted)', marginTop: 4 }}>
        <span style={{ color }}>● Health</span>
        <span style={{ color: '#22d3ee' }}>● Temp</span>
        <span style={{ color: '#a78bfa' }}>● Sound</span>
      </div>
    </div>
  );
};

// ── Master Component with 1-Click Style Switcher ──
const HealthRingGauge = ({ score = 100 }) => {
  const [style, setStyle] = useState(() => {
    try { return localStorage.getItem('gauge-style') || 'sphere'; }
    catch { return 'sphere'; }
  });

  const clampedScore = Math.max(0, Math.min(100, Math.round(score)));

  const changeStyle = (s) => {
    setStyle(s);
    try { localStorage.setItem('gauge-style', s); } catch {}
  };

  const options = [
    { id: 'sphere', icon: '🧪', label: 'Sphere' },
    { id: 'hex',    icon: '🐝', label: 'Hex' },
    { id: 'cyber',  icon: '⭕', label: 'Reactor' },
    { id: 'rings',  icon: '⌚', label: 'Rings' },
  ];

  return (
    <div style={{ width: '100%' }}>
      {/* Sleek Style Switcher Bar */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginBottom: '12px', flexWrap: 'wrap' }}>
        {options.map((opt) => (
          <button
            key={opt.id}
            onClick={() => changeStyle(opt.id)}
            title={opt.label}
            style={{
              background: style === opt.id ? 'rgba(34,211,238,0.15)' : 'var(--bg-surface)',
              border: style === opt.id ? '1px solid rgba(34,211,238,0.3)' : '1px solid var(--border-default)',
              color: style === opt.id ? 'var(--cyan-400)' : 'var(--text-muted)',
              borderRadius: '6px', padding: '3px 8px', fontSize: '11px', fontWeight: 600,
              cursor: 'pointer', transition: 'all 0.15s ease'
            }}
          >
            {opt.icon} {opt.label}
          </button>
        ))}
      </div>

      {/* Active Gauge Rendering */}
      {style === 'sphere' && <BioSphereGauge score={clampedScore} />}
      {style === 'hex'    && <HoneycombGauge score={clampedScore} />}
      {style === 'cyber'  && <CyberReactorGauge score={clampedScore} />}
      {style === 'rings'  && <SmartRingsGauge score={clampedScore} />}
    </div>
  );
};

export default HealthRingGauge;
