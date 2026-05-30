import { X } from "lucide-react";
import { Toaster as Sonner, type ToasterProps } from "sonner";

import { toastThemeCssVars } from "@/theme/toast-theme";

import "./sonner.css";

function Toaster({ ...props }: ToasterProps) {
  return (
    <Sonner
      theme="dark"
      position="top-right"
      richColors
      closeButton
      className="toaster jos-toaster group"
      style={toastThemeCssVars}
      icons={{
        close: <X className="size-3.5" strokeWidth={2.25} aria-hidden />,
      }}
      toastOptions={{
        closeButtonAriaLabel: "Đóng thông báo",
        classNames: {
          toast: "group toast shadow-lg select-text",
          title: "select-text",
          description: "select-text",
          content: "select-text",
          actionButton: "group-[.toast]:font-medium",
          cancelButton: "group-[.toast]:opacity-80",
          closeButton: "jos-toast-close",
        },
      }}
      {...props}
    />
  );
}

export { Toaster };
