import { useEffect } from "react";
import { X } from "lucide-react";
import clsx from "clsx";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}

export const Modal = ({ isOpen, onClose, title, children, size = "md" }: Props) => {
  useEffect(() => {
    if (isOpen) document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div
        className={clsx(
          "relative bg-white rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto",
          size === "sm"  && "w-full max-w-sm",
          size === "md"  && "w-full max-w-lg",
          size === "lg"  && "w-full max-w-2xl",
          size === "xl"  && "w-full max-w-4xl",
        )}
      >
        {title && (
          <div className="flex items-center justify-between p-5 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors">
              <X size={18} className="text-gray-500" />
            </button>
          </div>
        )}
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
};
