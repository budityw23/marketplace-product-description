import * as React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  className?: string;
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  className,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black bg-opacity-50"
        onClick={onClose}
      />

      {/* Modal */}
      <div
        className={cn(
          'relative bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto',
          className
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-gray-100 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {children}
        </div>
      </div>
    </div>
  );
};

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

export const Dialog: React.FC<DialogProps> = ({ open, onOpenChange, children }) => {
  return (
    <Modal
      isOpen={open}
      onClose={() => onOpenChange(false)}
      title=""
      className="max-w-2xl"
    >
      {children}
    </Modal>
  );
};

export const DialogContent = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={cn('', className)}>{children}</div>
);

export const DialogHeader = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div className={cn('mb-4', className)}>{children}</div>
);

export const DialogTitle = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <h2 className={cn('text-xl font-semibold', className)}>{children}</h2>
);

export const DialogDescription = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <p className={cn('text-gray-600', className)}>{children}</p>
);