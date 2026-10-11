import React from 'react';

const HoneyClusterArt = () => {
  return (
    <div className="honey-cluster-container">
      {/* ── Top Margin Cluster (Header Gutter Space) ── */}
      <svg className="honey-cluster-top" viewBox="0 0 320 220" fill="none" xmlns="http://www.w3.org/2000/svg">
        <g stroke="var(--cluster-stroke, #f59e0b)" strokeWidth="1.6" strokeLinejoin="round">
          <path d="M40 20 L66 35 L66 65 L40 80 L14 65 L14 35 Z" />
          <path d="M92 20 L118 35 L118 65 L92 80 L66 65 L66 35 Z" fill="var(--cluster-fill, rgba(245, 158, 11, 0.22))" />
          <path d="M144 20 L170 35 L170 65 L144 80 L118 65 L118 35 Z" />
          
          <path d="M14 65 L40 80 L40 110 L14 125 L-12 110 L-12 80 Z" fill="var(--cluster-fill, rgba(245, 158, 11, 0.18))" />
          <path d="M66 65 L92 80 L92 110 L66 125 L40 110 L40 80 Z" />
          <path d="M118 65 L144 80 L144 110 L118 125 L92 110 L92 80 Z" fill="var(--cluster-fill, rgba(245, 158, 11, 0.24))" />
          <path d="M170 65 L196 80 L196 110 L170 125 L144 110 L144 80 Z" />
        </g>
        
        <path d="M88 24 L112 38 L112 62 L88 76 L64 62 L64 38 Z" stroke="var(--cluster-stroke, #f59e0b)" strokeWidth="1.2" strokeOpacity="0.75" />
        <path d="M114 69 L138 83 L138 107 L114 121 L90 107 L90 83 Z" stroke="var(--cluster-stroke, #f59e0b)" strokeWidth="1.2" strokeOpacity="0.75" />
      </svg>

      {/* ── Right Gutter Cluster (Open Edge Space) ── */}
      <svg className="honey-cluster-right" viewBox="0 0 260 200" fill="none" xmlns="http://www.w3.org/2000/svg">
        <g stroke="var(--cluster-stroke, #f59e0b)" strokeWidth="1.6" strokeLinejoin="round">
          <path d="M66 20 L92 35 L92 65 L66 80 L40 65 L40 35 Z" fill="var(--cluster-fill, rgba(245, 158, 11, 0.22))" />
          <path d="M118 20 L144 35 L144 65 L118 80 L92 65 L92 35 Z" />
          
          <path d="M40 65 L66 80 L66 110 L40 125 L14 110 L14 80 Z" fill="var(--cluster-fill, rgba(245, 158, 11, 0.18))" />
          <path d="M92 65 L118 80 L118 110 L92 125 L66 110 L66 80 Z" />
          <path d="M144 65 L170 80 L170 110 L144 125 L118 110 L118 80 Z" fill="var(--cluster-fill, rgba(245, 158, 11, 0.24))" />
        </g>
        
        <path d="M62 24 L86 38 L86 62 L62 76 L38 62 L38 38 Z" stroke="var(--cluster-stroke, #f59e0b)" strokeWidth="1.2" strokeOpacity="0.75" />
        <path d="M140 69 L164 83 L164 107 L140 121 L116 107 L116 83 Z" stroke="var(--cluster-stroke, #f59e0b)" strokeWidth="1.2" strokeOpacity="0.75" />
      </svg>
    </div>
  );
};

export default HoneyClusterArt;
