import { forwardRef } from "react";

import { IconBase, type IconProps } from "./icon-base";

export const PauseIcon = forwardRef<SVGSVGElement, IconProps>(
	function PauseIcon(props, ref) {
		return (
			<IconBase ref={ref} {...props}>
				<path
					d="M7 3C5.34315 3 4 4.34315 4 6V18C4 19.6569 5.34315 21 7 21C8.65685 21 10 19.6569 10 18V6C10 4.34315 8.65685 3 7 3Z"
					fill="currentColor"
				/>
				<path
					d="M17 3C15.3431 3 14 4.34315 14 6V18C14 19.6569 15.3431 21 17 21C18.6569 21 20 19.6569 20 18V6C20 4.34315 18.6569 3 17 3Z"
					fill="currentColor"
				/>
			</IconBase>
		);
	},
);

PauseIcon.displayName = "PauseIcon";
