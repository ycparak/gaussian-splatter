import { forwardRef } from "react";

import { IconBase, type IconProps } from "./icon-base";

export const ColorIcon = forwardRef<SVGSVGElement, IconProps>(
  function ColorIcon(props, ref) {
    return (
      <IconBase ref={ref} {...props}>
        <path
          d="M9.25 2.75H5.75C4.09315 2.75 2.75 4.09315 2.75 5.75V16.5C2.75 19.1234 4.87665 21.25 7.5 21.25C10.1234 21.25 12.25 19.1234 12.25 16.5V5.75C12.25 4.09315 10.9069 2.75 9.25 2.75Z"
          stroke="currentColor"
          strokeLinecap="square"
          strokeLinejoin="round"
          strokeWidth="2"
        />
        <path
          d="M11.6133 18.8751L16.9883 9.56538C17.8167 8.1305 17.3251 6.29573 15.8902 5.4673L12.4948 3.50694C12.3422 3.41888 12.1549 3.41625 12 3.5"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
        />
        <path
          d="M9.875 20.6136L19.1848 15.2386C20.6197 14.4102 21.1113 12.5754 20.2828 11.1406L18.5215 8.08974C18.3108 7.72481 17.9214 7.5 17.5 7.5"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
        />
        <path
          d="M9.25 16.5C9.25 17.4665 8.4665 18.25 7.5 18.25C6.5335 18.25 5.75 17.4665 5.75 16.5C5.75 15.5335 6.5335 14.75 7.5 14.75C8.4665 14.75 9.25 15.5335 9.25 16.5Z"
          stroke="currentColor"
          strokeLinecap="square"
          strokeLinejoin="round"
          strokeWidth="2"
        />
      </IconBase>
    );
  },
);

ColorIcon.displayName = "ColorIcon";
