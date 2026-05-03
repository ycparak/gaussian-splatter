"use client";

import type { ComponentPropsWithoutRef, ReactNode } from "react";

import { cn } from "@/src/lib/utils";

type ButtonVariant = "default";
type ButtonSize = "default" | "sm" | "xs" | "icon-xs" | "icon-sm";

export type ButtonProps = ComponentPropsWithoutRef<"button"> & {
  icon?: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export function Button({
  className,
  children,
  icon,
  variant = "default",
  size,
  type = "button",
  ...props
}: ButtonProps) {
  const hasLabel = children !== undefined && children !== null;
  const variantClassName = variantStyles[variant];
  const sizeClassName = size
    ? sizeStyles[size]
    : hasLabel
      ? "h-9 gap-2 px-4"
      : "size-9 p-0";

  return (
    <button
      type={type}
      className={cn(
        "inline-flex items-center justify-center whitespace-nowrap rounded-[10px] text-xs backdrop-blur-[20px] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
        variantClassName,
        sizeClassName,
        className,
      )}
      {...props}
    >
      {icon ? (
        <span
          aria-hidden="true"
          className="flex shrink-0 items-center justify-center text-current"
        >
          {icon}
        </span>
      ) : null}
      {hasLabel ? <span className="truncate">{children}</span> : null}
    </button>
  );
}

export default Button;

const variantStyles: Record<ButtonVariant, string> = {
  default:
    "border border-white/5 bg-neutral-800/50 text-neutral-400 hover:bg-neutral-800/60",
};

const sizeStyles: Record<ButtonSize, string> = {
  default: "h-9 px-4 py-2",
  sm: "h-8 gap-2 rounded-md px-3",
  xs: "h-7 gap-2 rounded-md px-2.5 text-[11px]",
  "icon-xs": "size-7 p-0",
  "icon-sm": "size-8 p-0",
};
