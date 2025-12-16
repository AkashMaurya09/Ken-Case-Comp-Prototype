
import React from "react";

export const RetroGrid = ({ className }: { className?: string }) => {
  return (
    <div className={`pointer-events-none absolute h-full w-full overflow-hidden opacity-40 [perspective:200px] ${className || ""}`}>
      {/* Grid */}
      <div className="absolute inset-0 [transform:rotateX(35deg)]">
        <div
          className="animate-grid-flow -ml-[50%] h-[300%] w-[200%]"
          style={{
            backgroundImage: `linear-gradient(to right, rgba(99, 102, 241, 0.3) 1px, transparent 0), linear-gradient(to bottom, rgba(99, 102, 241, 0.3) 1px, transparent 0)`,
            backgroundSize: '50px 50px',
            backgroundRepeat: 'repeat',
          }}
        />
      </div>

      {/* Gradient Fade */}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-50 via-slate-50/90 to-transparent" />
    </div>
  );
};
