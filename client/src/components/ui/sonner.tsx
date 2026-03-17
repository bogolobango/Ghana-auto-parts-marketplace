import { useTheme } from "next-themes";
import { Toaster as Sonner, type ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        className: "rounded-2xl backdrop-blur-xl border-white/25 shadow-[0_8px_32px_-6px_rgba(0,0,0,0.08)]",
      }}
      style={
        {
          "--normal-bg": "rgba(255, 255, 255, 0.80)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "rgba(255, 255, 255, 0.25)",
        } as React.CSSProperties
      }
      {...props}
    />
  );
};

export { Toaster };
