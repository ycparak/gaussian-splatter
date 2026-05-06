import { forwardRef, type ReactNode, type SVGProps } from "react";

import { cn } from "@/src/lib/utils";

export type IconProps = SVGProps<SVGSVGElement> & {
  title?: string;
};

type IconBaseProps = IconProps & {
  children: ReactNode;
};

export const IconBase = forwardRef<SVGSVGElement, IconBaseProps>(
  function IconBase({ title, className, children, ...props }, ref) {
    const ariaLabel = title ?? props["aria-label"] ?? "Icon";

    return (
      <svg
        ref={ref}
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        role="img"
        aria-label={ariaLabel}
        className={cn("shrink-0", className)}
        {...props}
      >
        {title ? <title>{title}</title> : null}
        {children}
      </svg>
    );
  },
);

IconBase.displayName = "IconBase";
