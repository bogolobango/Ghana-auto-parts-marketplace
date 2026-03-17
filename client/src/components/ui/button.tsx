import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl text-sm font-medium tracking-wide transition-all duration-300 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow-[0_4px_20px_-4px_rgba(0,0,0,0.12)] hover:bg-primary/90 hover:shadow-[0_6px_24px_-4px_rgba(0,0,0,0.16)] hover:scale-[1.02] active:scale-[0.98]",
        destructive:
          "bg-destructive text-white shadow-[0_4px_20px_-4px_rgba(0,0,0,0.12)] hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        outline:
          "border border-border/60 bg-white/40 backdrop-blur-sm shadow-[0_2px_12px_-2px_rgba(0,0,0,0.04)] hover:bg-white/60 hover:shadow-[0_4px_20px_-4px_rgba(0,0,0,0.06)] dark:bg-transparent dark:border-input dark:hover:bg-input/50",
        secondary:
          "bg-secondary/80 text-secondary-foreground backdrop-blur-sm hover:bg-secondary/60",
        ghost:
          "hover:bg-accent/60 dark:hover:bg-accent/50",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-5 py-2 has-[>svg]:px-4",
        sm: "h-8 rounded-xl gap-1.5 px-3.5 has-[>svg]:px-2.5",
        lg: "h-12 rounded-[100px] px-8 has-[>svg]:px-5 text-[15px]",
        icon: "size-10 rounded-2xl",
        "icon-sm": "size-8 rounded-xl",
        "icon-lg": "size-11 rounded-2xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
