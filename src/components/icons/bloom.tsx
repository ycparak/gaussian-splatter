import { forwardRef } from "react";

import { IconBase, type IconProps } from "./icon-base";

export const BloomIcon = forwardRef<SVGSVGElement, IconProps>(
	function BloomIcon(props, ref) {
		return (
			<IconBase ref={ref} {...props}>
				<path
					d="M3 3L5.5 5.5M21 3L18.5 5.5M3 21L5.5 18.5M21 21L18.5 18.5"
					stroke="currentColor"
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth="2"
				/>
				<path
					d="M14.4157 8.02124L12.7948 4.27224C12.6577 3.95524 12.3454 3.75 12 3.75C11.6546 3.75 11.3423 3.95524 11.2052 4.27224L9.58432 8.02124C9.28124 8.72223 8.72223 9.28124 8.02124 9.58432L4.27224 11.2052C3.95524 11.3423 3.75 11.6546 3.75 12C3.75 12.3454 3.95524 12.6577 4.27224 12.7948L8.02124 14.4157C8.72223 14.7188 9.28124 15.2778 9.58432 15.9788L11.2052 19.7278C11.3423 20.0448 11.6546 20.25 12 20.25C12.3454 20.25 12.6577 20.0448 12.7948 19.7278L14.4157 15.9788C14.7188 15.2778 15.2778 14.7188 15.9788 14.4157L19.7278 12.7948C20.0448 12.6577 20.25 12.3454 20.25 12C20.25 11.6546 20.0448 11.3423 19.7278 11.2052L15.9788 9.58432C15.2778 9.28124 14.7188 8.72223 14.4157 8.02124Z"
					stroke="currentColor"
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth="2"
				/>
			</IconBase>
		);
	},
);

BloomIcon.displayName = "BloomIcon";
