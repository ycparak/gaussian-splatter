"use client";

import type { ComponentPropsWithoutRef } from "react";

import { cn } from "@/src/lib/utils";

export type ScrollAreaProps = ComponentPropsWithoutRef<"div">;

export function ScrollArea({ className, ...props }: ScrollAreaProps) {
  return (
    <div
      className={cn("min-h-0 overflow-y-auto overflow-x-hidden", className)}
      {...props}
    />
  );
}

export default ScrollArea;
