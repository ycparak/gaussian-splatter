import { Separator as SeparatorPrimitive } from "@base-ui/react/separator";
import type { ComponentProps } from "react";
import { cn } from "@/src/lib/utils";

type SeparatorProps = ComponentProps<typeof SeparatorPrimitive>;

function Separator({
	className,
	orientation = "horizontal",
	...props
}: SeparatorProps) {
	return (
		<SeparatorPrimitive
			data-slot="separator"
			orientation={orientation}
			className={cn(
				"shrink-0 bg-border data-horizontal:h-px data-horizontal:w-full data-vertical:w-px data-vertical:self-stretch",
				className,
			)}
			{...props}
		/>
	);
}

export { Separator };
