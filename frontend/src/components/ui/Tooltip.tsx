import { useState, useRef, useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
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
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({});
  const triggerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isVisible && triggerRef.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect();
      const tooltipWidth = parseInt(width) || 320;
      const gap = 8;

      let top = 0;
      let left = 0;

      switch (position) {
        case "top":
          top = triggerRect.top - gap;
          left = triggerRect.left + triggerRect.width / 2 - tooltipWidth / 2;
          break;
        case "bottom":
          top = triggerRect.bottom + gap;
          left = triggerRect.left + triggerRect.width / 2 - tooltipWidth / 2;
          break;
        case "left":
          top = triggerRect.top + triggerRect.height / 2;
          left = triggerRect.left - tooltipWidth - gap;
          break;
        case "right":
          top = triggerRect.top + triggerRect.height / 2;
          left = triggerRect.right + gap;
          break;
      }

      // Adjust if tooltip goes off screen horizontally
      if (left + tooltipWidth > window.innerWidth - 16) {
        left = window.innerWidth - tooltipWidth - 16;
      }
      if (left < 16) {
        left = 16;
      }

      // Adjust if tooltip goes off screen vertically
      if (top < 16) {
        top = 16;
      }

      setTooltipStyle({
        top: position === "top" ? undefined : top,
        bottom: position === "top" ? window.innerHeight - triggerRect.top + gap : undefined,
        left,
        width,
      });
    }
  }, [isVisible, position, width]);

  return (
    <div
      className="tooltip-wrapper"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      <div ref={triggerRef} className="tooltip-trigger">
        {trigger}
      </div>
      {createPortal(
        <div
          className={`tooltip-portal tooltip-${position} ${isVisible ? "visible" : ""}`}
          style={tooltipStyle}
        >
          {children}
        </div>,
        document.body
      )}
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
