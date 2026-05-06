"use client";

import type { ComponentPropsWithoutRef } from "react";

import { cn } from "@/src/lib/utils";

type SeparatorProps = ComponentPropsWithoutRef<"hr">;

export function Separator({ className, ...props }: SeparatorProps) {
  return (
    <hr
      className={cn("border-0 border-t border-white/10", className)}
      {...props}
    />
  );
}

export default Separator;
