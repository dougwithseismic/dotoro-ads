"use client";

import { useState, useRef, useEffect } from "react";
import styles from "./ErrorTooltip.module.css";

interface ErrorTooltipProps {
  message: string;
  children: React.ReactNode;
}

export function ErrorTooltip({ message, children }: ErrorTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState<"top" | "bottom">("top");
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isVisible && triggerRef.current && tooltipRef.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect();
      const tooltipHeight = tooltipRef.current.offsetHeight;

      // Check if there's enough space above
      if (triggerRect.top < tooltipHeight + 10) {
        setPosition("bottom");
      } else {
        setPosition("top");
      }
    }
  }, [isVisible]);

  return (
    <div
      ref={triggerRef}
      className={styles.container}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onFocus={() => setIsVisible(true)}
      onBlur={() => setIsVisible(false)}
    >
      {children}
      {isVisible && (
        <div
          ref={tooltipRef}
          className={styles.tooltip}
          data-position={position}
          role="tooltip"
        >
          <div className={styles.icon}>
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              aria-hidden="true"
            >
              <circle cx="7" cy="7" r="6" stroke="currentColor" strokeWidth="1.5" />
              <path
                d="M7 4V7.5M7 10V10.01"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
          </div>
          <span className={styles.message}>{message}</span>
          <div className={styles.arrow} />
        </div>
      )}
    </div>
  );
}
