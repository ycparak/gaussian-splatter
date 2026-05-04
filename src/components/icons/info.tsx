import { forwardRef } from "react";

import { IconBase, type IconProps } from "./icon-base";

export const InfoIcon = forwardRef<SVGSVGElement, IconProps>(
	function InfoIcon(props, ref) {
		return (
			<IconBase ref={ref} {...props}>
				<path
					d="M10 10.5H11C11.5523 10.5 12 10.9477 12 11.5V19M12 19H10M12 19H14"
					stroke="currentColor"
					strokeWidth="2"
					strokeLinecap="round"
					strokeLinejoin="round"
				/>
				<circle cx="12" cy="5.5" r="1.5" fill="currentColor" />
			</IconBase>
		);
	},
);

InfoIcon.displayName = "InfoIcon";
