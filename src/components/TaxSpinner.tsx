"use client";

import { motion } from "motion/react";
import "../lib/shiny-text.css";

const dots = [
  { cx: 32, cy: 32, r: 7 },
  { cx: 32, cy: 16, r: 5 },
  { cx: 47, cy: 17, r: 4 },
  { cx: 48, cy: 32, r: 5 },
  { cx: 16, cy: 32, r: 5 },
  { cx: 17, cy: 17, r: 4 },
  { cx: 17, cy: 47, r: 4 },
  { cx: 32, cy: 48, r: 5 },
  { cx: 47, cy: 47, r: 4 },
  { cx: 32, cy: 3, r: 3 },
  { cx: 32, cy: 61, r: 3 },
  { cx: 19, cy: 5, r: 3 },
  { cx: 45, cy: 5, r: 3 },
  { cx: 19, cy: 59, r: 3 },
  { cx: 45, cy: 59, r: 3 },
  { cx: 5, cy: 19, r: 3 },
  { cx: 59, cy: 19, r: 3 },
  { cx: 3, cy: 32, r: 3 },
  { cx: 61, cy: 32, r: 3 },
  { cx: 5, cy: 45, r: 3 },
  { cx: 59, cy: 45, r: 3 },
];

export default function TaxSpinner() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "10px",
      }}
    >
      <svg
        width="22"
        height="22"
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {dots.map((dot, index) => {
          const d = Math.hypot(dot.cx - 32, dot.cy - 32);

          return (
            <motion.circle
              key={index}
              cx={dot.cx}
              cy={dot.cy}
              r={dot.r}
              fill="#FC532A"
              animate={{
                scale: [0.85, 1, 0.85],
                opacity: [0.6, 1, 0.6],
              }}
              transition={{
                duration: 1.6,
                repeat: Infinity,
                ease: "easeInOut",
                delay: d * 0.015,
              }}
            />
          );
        })}
      </svg>

      <span className="shiny-text">Thinking...</span>
    </div>
  );
}
