import { forwardRef } from "react";

import { IconBase, type IconProps } from "./icon-base";

export const ResetIcon = forwardRef<SVGSVGElement, IconProps>(
	function ResetIcon(props, ref) {
		return (
			<IconBase ref={ref} {...props}>
				<path
					d="M6 20V10.5C6 6.91015 8.91015 4 12.5 4C16.0899 4 19 6.91015 19 10.5V11C19 13.973 16.8377 16.441 14 16.917"
					stroke="currentColor"
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth="2"
				/>
				<path
					d="M3 17L6 20L9 17"
					stroke="currentColor"
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth="2"
				/>
			</IconBase>
		);
	},
);

ResetIcon.displayName = "ResetIcon";
