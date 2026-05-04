import { forwardRef } from "react";

import { IconBase, type IconProps } from "./icon-base";

export const RandomIcon = forwardRef<SVGSVGElement, IconProps>(
	function RandomIcon(props, ref) {
		return (
			<IconBase ref={ref} {...props}>
				<path
					d="M3 18H3.75736C4.55301 18 5.31607 17.6839 5.87868 17.1213L15.1213 7.87868C15.6839 7.31607 16.447 7 17.2426 7H19M3 6H3.75736C4.55301 6 5.31607 6.31607 5.87868 6.87868L8 9M19 17H17.2426C16.447 17 15.6839 16.6839 15.1213 16.1213L14 15M18 4L21 7L18 10M18 14L21 17L18 20"
					stroke="currentColor"
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth="2"
				/>
			</IconBase>
		);
	},
);

RandomIcon.displayName = "RandomIcon";
