import { forwardRef } from "react";

import { IconBase, type IconProps } from "./icon-base";

export const ChevronRightIcon = forwardRef<SVGSVGElement, IconProps>(
	function ChevronRightIcon(props, ref) {
		return (
			<IconBase ref={ref} {...props}>
				<path
					d="M10 16L12.9393 13.0607C13.5251 12.4749 13.5251 11.5251 12.9393 10.9393L10 8"
					stroke="currentColor"
					strokeWidth="2"
					strokeLinecap="round"
					strokeLinejoin="round"
				/>
			</IconBase>
		);
	},
);

ChevronRightIcon.displayName = "ChevronRightIcon";
