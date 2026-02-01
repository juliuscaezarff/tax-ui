import { Button as BaseButton } from "@base-ui/react/button";
import type { ComponentProps, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "danger-outline";
type Size = "sm" | "md";

interface ButtonProps extends Omit<ComponentProps<typeof BaseButton>, "className"> {
  variant?: Variant;
  size?: Size;
  className?: string;
  children: ReactNode;
}

const variantStyles: Record<Variant, string> = {
  primary: "bg-(--color-text) text-(--color-bg) hover:opacity-90",
  secondary: "bg-(--color-bg-muted) text-(--color-text) border border-(--color-border) hover:bg-(--color-bg-subtle)",
  ghost: "text-(--color-text-muted) hover:text-(--color-text) hover:bg-(--color-bg-muted)",
  danger: "bg-red-500 text-white hover:bg-red-600",
  "danger-outline": "border border-red-400/50 text-red-500 hover:bg-red-500 hover:text-white hover:border-red-500",
};

const sizeStyles: Record<Size, string> = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2 text-sm",
};

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <BaseButton
      className={[
        "rounded-lg outline-none",
        "focus-visible:ring-2 focus-visible:ring-(--color-text-muted) focus-visible:ring-offset-2 focus-visible:ring-offset-(--color-bg)",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        variantStyles[variant],
        sizeStyles[size],
        className,
      ].join(" ")}
      disabled={disabled}
      {...props}
    >
      {children}
    </BaseButton>
  );
}
