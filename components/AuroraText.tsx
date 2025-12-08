
import React from "react";

interface AuroraTextProps extends React.HTMLAttributes<HTMLElement> {
  className?: string;
  children: React.ReactNode;
  as?: React.ElementType;
}

export const AuroraText: React.FC<AuroraTextProps> = ({
  className,
  children,
  as: Component = "span",
  ...props
}) => {
  return (
    <Component
      className={`relative inline-block text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 animate-aurora-text bg-[length:200%_auto] ${className || ""}`}
      {...props}
    >
      {children}
    </Component>
  );
};
