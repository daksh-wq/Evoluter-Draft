import React from 'react';

/**
 * GlobalStyles Component
 * Contains CSS-in-JS styles for custom animations and utilities
 */
const GlobalStyles = () => (
    <style>{`
    /* 3D Transform Utilities */
    .perspective-1000 { perspective: 1000px; }
    .transform-style-3d { transform-style: preserve-3d; }
    .backface-hidden { backface-visibility: hidden; }
    .rotate-y-180 { transform: rotateY(180deg); }
    
    /* Scan Animation for loading states */
    @keyframes scan {
      0% { top: 0%; opacity: 0; }
      50% { opacity: 1; }
      100% { top: 100%; opacity: 0; }
    }
    .animate-scan { animation: scan 2s linear infinite; }
    
    /* Hide scrollbar while maintaining scroll functionality */
    .scrollbar-hide::-webkit-scrollbar { display: none; }
    .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
    
    /* Fade in animation for views */
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .animate-fade-in { animation: fadeIn 0.5s ease-out; }
    
    /* Pulse animation for live indicators */
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.5; }
    }
    .animate-pulse-custom { animation: pulse 2s ease-in-out infinite; }
  `}</style>
);

export default GlobalStyles;
