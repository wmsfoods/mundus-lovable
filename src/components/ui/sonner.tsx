import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="top-center"
      offset={{ top: 24, right: 24, bottom: 24, left: 24 }}
      mobileOffset={{
        top: "calc(env(safe-area-inset-top) + 16px)",
        right: "calc(env(safe-area-inset-right) + 16px)",
        bottom: "calc(env(safe-area-inset-bottom) + 16px)",
        left: "calc(env(safe-area-inset-left) + 16px)",
      }}
      richColors
      closeButton
      // Keep toasts inside the viewport on small screens.
      style={
        {
          "--width": "min(380px, calc(100vw - 32px))",
          "--success-bg": "hsl(var(--toast-success-bg))",
          "--success-border": "hsl(var(--toast-success-border))",
          "--success-text": "hsl(var(--toast-success-text))",
          "--info-bg": "hsl(var(--toast-info-bg))",
          "--info-border": "hsl(var(--toast-info-border))",
          "--info-text": "hsl(var(--toast-info-text))",
          "--warning-bg": "hsl(var(--toast-warning-bg))",
          "--warning-border": "hsl(var(--toast-warning-border))",
          "--warning-text": "hsl(var(--toast-warning-text))",
          "--error-bg": "hsl(var(--toast-error-bg))",
          "--error-border": "hsl(var(--toast-error-border))",
          "--error-text": "hsl(var(--toast-error-text))",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
