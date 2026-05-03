"use client";

import type { ComponentPropsWithoutRef } from "react";

import { cn } from "@/src/lib/utils";

type SeparatorProps = ComponentPropsWithoutRef<"hr">;

export function Separator({ className, ...props }: SeparatorProps) {
	return (
		<hr
			className={cn("h-px w-full shrink-0 border-0 bg-border", className)}
			{...props}
		/>
	);
}

export default Separator;
