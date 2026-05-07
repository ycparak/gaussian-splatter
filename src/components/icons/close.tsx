import { forwardRef } from "react";

import { IconBase, type IconProps } from "./icon-base";

export const CloseIcon = forwardRef<SVGSVGElement, IconProps>(
  function CloseIcon(props, ref) {
    return (
      <IconBase ref={ref} {...props}>
        <path
          d="M6.5 6.5L17.5 17.5M17.5 6.5L6.5 17.5"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
        />
      </IconBase>
    );
  },
);

CloseIcon.displayName = "CloseIcon";
