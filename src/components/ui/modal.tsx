import type { ReactNode } from "react";

type ModalProps = {
  children: ReactNode;
  onClose?: () => void;
};

export function Modal({ children, onClose }: ModalProps) {
  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 rounded-lg shadow-lg p-6 w-80 relative">
        {onClose ? (
          <button
            className="absolute top-2 right-2 text-gray-400 dark:text-gray-500"
            onClick={onClose}
          >
            &times;
          </button>
        ) : null}
        {children}
      </div>
    </div>
  );
}
