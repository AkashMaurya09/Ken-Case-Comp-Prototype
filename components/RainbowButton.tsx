
import React from "react";

interface RainbowButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {}

export const RainbowButton: React.FC<RainbowButtonProps> = ({
  children,
  className,
  ...props
}) => {
  return (
    <button
      className={`group relative inline-flex h-11 animate-rainbow cursor-pointer items-center justify-center rounded-xl border-0 bg-[length:200%] px-8 py-2 font-medium text-white transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 ${className || ""}`}
      style={{
        backgroundOrigin: 'border-box',
        backgroundClip: 'padding-box, border-box, border-box',
        border: '2px solid transparent',
        backgroundImage: `linear-gradient(#121213, #121213), linear-gradient(#121213 50%, rgba(18, 18, 19, 0.6) 80%, rgba(18, 18, 19, 0)), linear-gradient(90deg, hsl(var(--color-1)), hsl(var(--color-5)), hsl(var(--color-3)), hsl(var(--color-4)), hsl(var(--color-2)))`,
      }}
      {...props}
    >
      <div className="flex items-center gap-2">
        {children}
      </div>
    </button>
  );
};
