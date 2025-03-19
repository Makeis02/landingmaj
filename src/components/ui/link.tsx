
import * as React from "react";
import { cn } from "@/lib/utils";

export interface LinkProps
  extends React.AnchorHTMLAttributes<HTMLAnchorElement> {}

const Link = React.forwardRef<HTMLAnchorElement, LinkProps>(
  ({ className, ...props }, ref) => {
    return (
      <a
        ref={ref}
        className={cn(
          "transition-colors hover:text-foreground/80",
          className
        )}
        {...props}
      />
    );
  }
);
Link.displayName = "Link";

export { Link };