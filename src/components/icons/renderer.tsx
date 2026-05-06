import { forwardRef } from "react";

import { IconBase, type IconProps } from "./icon-base";

export const RendererIcon = forwardRef<SVGSVGElement, IconProps>(
	function RendererIcon(props, ref) {
		return (
			<IconBase ref={ref} {...props}>
				<path
					d="M12 3.75V20.25"
					stroke="currentColor"
					strokeLinecap="round"
					strokeWidth="2"
				/>
				<path
					d="M2.75 12H8.25"
					stroke="currentColor"
					strokeLinecap="round"
					strokeWidth="2"
				/>
				<path
					d="M15.75 12H21.25"
					stroke="currentColor"
					strokeLinecap="round"
					strokeWidth="2"
				/>
				<path
					d="M15.5 7.5L20.25 3.75"
					stroke="currentColor"
					strokeLinecap="round"
					strokeWidth="2"
				/>
				<path
					d="M20.25 20.25L15.5 16.5"
					stroke="currentColor"
					strokeLinecap="round"
					strokeWidth="2"
				/>
				<path
					d="M2.75 15.75H8.25"
					stroke="currentColor"
					strokeLinecap="round"
					strokeWidth="2"
				/>
				<path
					d="M2.75 7.75H8.25"
					stroke="currentColor"
					strokeLinecap="round"
					strokeWidth="2"
				/>
			</IconBase>
		);
	},
);

RendererIcon.displayName = "RendererIcon";
