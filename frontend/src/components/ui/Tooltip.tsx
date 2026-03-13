import { useState, useRef, useEffect, type ReactNode } from "react";
import "./Tooltip.css";

type Props = {
  trigger: ReactNode;
  children: ReactNode;
  position?: "top" | "bottom" | "left" | "right";
  width?: string;
};

export function Tooltip({
  trigger,
  children,
  position = "bottom",
  width = "320px",
}: Props) {
  const [isVisible, setIsVisible] = useState(false);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isVisible && tooltipRef.current && triggerRef.current) {
      const tooltip = tooltipRef.current;
      const rect = tooltip.getBoundingClientRect();

      // Adjust if tooltip goes off screen
      if (rect.right > window.innerWidth) {
        tooltip.style.left = "auto";
        tooltip.style.right = "0";
      }
      if (rect.left < 0) {
        tooltip.style.left = "0";
        tooltip.style.right = "auto";
      }
    }
  }, [isVisible]);

  return (
    <div
      className="tooltip-wrapper"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      <div ref={triggerRef} className="tooltip-trigger">
        {trigger}
      </div>
      <div
        ref={tooltipRef}
        className={`tooltip tooltip-${position} ${isVisible ? "visible" : ""}`}
        style={{ width }}
      >
        {children}
      </div>
    </div>
  );
}

// Pre-styled tooltip content components
export function TooltipTitle({ children }: { children: ReactNode }) {
  return <div className="tooltip-title">{children}</div>;
}

export function TooltipContent({ children }: { children: ReactNode }) {
  return <div className="tooltip-content">{children}</div>;
}

export function TooltipHint({ children }: { children: ReactNode }) {
  return <div className="tooltip-hint">{children}</div>;
}
