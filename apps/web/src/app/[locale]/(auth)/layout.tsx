import React from 'react';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-obsidian-0 relative overflow-hidden">
      {/* Background blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-[oklch(0.74_0.16_245)] blur-[120px] opacity-[0.07] animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-[oklch(0.55_0.20_260)] blur-[120px] opacity-[0.05] animate-pulse [animation-delay:2s]" />
      
      {/* Grid pattern overlay */}
      <div 
        className="absolute inset-0 opacity-[0.03]" 
        style={{ 
          backgroundImage: `radial-gradient(var(--color-line) 1px, transparent 1px)`, 
          backgroundSize: '32px 32px' 
        }} 
      />

      <div className="relative z-10 w-full flex justify-center px-4">
        {children}
      </div>

      {/* Footer info */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-6 text-[11px] text-ink-4 tracking-wider uppercase font-medium">
        <span className="hover:text-ink-2 transition cursor-default">Privacy</span>
        <span className="hover:text-ink-2 transition cursor-default">Terms</span>
        <span className="hover:text-ink-2 transition cursor-default">Security</span>
      </div>
    </div>
  );
}
