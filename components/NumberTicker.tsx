
import React, { useEffect, useRef } from "react";

export const NumberTicker = ({
  value,
  direction = "up",
  delay = 0,
  className,
  decimalPlaces = 0,
}: {
  value: number;
  direction?: "up" | "down";
  delay?: number;
  className?: string;
  decimalPlaces?: number;
}) => {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          const duration = 2000; // ms
          const start = direction === "down" ? value : 0;
          const end = direction === "down" ? 0 : value;
          const startTime = performance.now() + (delay * 1000);

          const step = (timestamp: number) => {
            if (timestamp < startTime) {
                requestAnimationFrame(step);
                return;
            }
            const progress = Math.min((timestamp - startTime) / duration, 1);
            const easeOutQuart = 1 - Math.pow(1 - progress, 4);
            const current = start + (end - start) * easeOutQuart;
            
            element.textContent = Intl.NumberFormat("en-US", {
              minimumFractionDigits: decimalPlaces,
              maximumFractionDigits: decimalPlaces,
            }).format(Number(current.toFixed(decimalPlaces)));

            if (progress < 1) {
              requestAnimationFrame(step);
            } else {
                element.textContent = Intl.NumberFormat("en-US", {
                    minimumFractionDigits: decimalPlaces,
                    maximumFractionDigits: decimalPlaces,
                }).format(end);
            }
          };

          requestAnimationFrame(step);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [value, direction, delay, decimalPlaces]);

  return (
    <span ref={ref} className={`inline-block tabular-nums tracking-wider ${className}`}>
      {direction === "down" ? value : 0}
    </span>
  );
};
