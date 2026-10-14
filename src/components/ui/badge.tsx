import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap [&>svg]:size-3",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        outline: "text-foreground",
        pending: "border-amber-500/30 bg-amber-500/15 text-amber-300",
        progress: "border-sky-500/30 bg-sky-500/15 text-sky-300",
        success: "border-emerald-500/30 bg-emerald-500/15 text-emerald-300",
        danger: "border-red-500/30 bg-red-500/15 text-red-300",
        important: "border-primary/40 bg-primary/15 text-primary",
      },
    },
    defaultVariants: { variant: "default" },
  },
);

function Badge({ className, variant, ...props }: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
