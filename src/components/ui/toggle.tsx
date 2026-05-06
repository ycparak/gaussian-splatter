"use client";

import { Switch } from "@base-ui/react/switch";
import type { ComponentPropsWithoutRef } from "react";
import { useState } from "react";

import { cn } from "@/src/lib/utils";

type SwitchRootProps = ComponentPropsWithoutRef<typeof Switch.Root>;

export type ToggleProps = Omit<
  SwitchRootProps,
  "children" | "checked" | "defaultChecked" | "onCheckedChange"
> & {
  label: string;
  checked?: boolean;
  defaultChecked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  className?: string;
  valueLabel?: string;
};

export function Toggle({
  label,
  checked,
  defaultChecked = false,
  onCheckedChange,
  className,
  valueLabel,
  style,
  ...props
}: ToggleProps) {
  const isControlled = checked !== undefined;
  const [uncontrolledChecked, setUncontrolledChecked] =
    useState(defaultChecked);
  const [isHovered, setIsHovered] = useState(false);

  const isChecked = isControlled ? checked : uncontrolledChecked;
  const shellClassName = getShellClassName(isChecked, isHovered);

  return (
    <Switch.Root
      checked={isControlled ? checked : undefined}
      defaultChecked={isControlled ? undefined : defaultChecked}
      onCheckedChange={(nextChecked) => {
        if (!isControlled) {
          setUncontrolledChecked(nextChecked);
        }

        onCheckedChange?.(nextChecked);
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        "relative h-9 w-full touch-none select-none overflow-hidden rounded-[10px] backdrop-blur-[10px] outline-none",
        shellClassName,
        className,
      )}
      style={{
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        WebkitTapHighlightColor: "transparent",
        ...style,
      }}
      {...props}
    >
      <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-xs leading-3 font-semibold text-neutral-400">
        {label}
      </span>
      <span
        className={cn(
          "pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-xs leading-3 font-semibold tabular-nums",
          isChecked ? "text-white" : "text-neutral-300",
        )}
      >
        {valueLabel ?? (isChecked ? "On" : "Off")}
      </span>
    </Switch.Root>
  );
}

export default Toggle;

function getShellClassName(isChecked: boolean, isHovered: boolean) {
  if (isChecked) {
    return isHovered ? "bg-neutral-600/50" : "bg-neutral-700/50";
  }

  return isHovered ? "bg-neutral-700/50" : "bg-neutral-800/50";
}
