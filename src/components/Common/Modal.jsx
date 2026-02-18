import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';

const Modal = ({
    isOpen,
    onClose,
    title,
    children,
    actions,
    maxWidth = 'md',
    fullScreen = false,
    showCloseButton = true,
}) => {
    const modalRef = useRef(null);

    // Handle ESC key to close modal
    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('keydown', handleEscape);
            // Prevent body scroll when modal is open
            document.body.style.overflow = 'hidden';
        }

        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, onClose]);

    // Handle backdrop click
    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    // Focus trap
    useEffect(() => {
        if (isOpen && modalRef.current) {
            const focusableElements = modalRef.current.querySelectorAll(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            );
            const firstElement = focusableElements[0];
            const lastElement = focusableElements[focusableElements.length - 1];

            const handleTab = (e) => {
                if (e.key === 'Tab') {
                    if (e.shiftKey && document.activeElement === firstElement) {
                        e.preventDefault();
                        lastElement.focus();
                    } else if (!e.shiftKey && document.activeElement === lastElement) {
                        e.preventDefault();
                        firstElement.focus();
                    }
                }
            };

            document.addEventListener('keydown', handleTab);
            firstElement?.focus();

            return () => {
                document.removeEventListener('keydown', handleTab);
            };
        }
    }, [isOpen]);

    if (!isOpen) return null;

    // Max width classes
    const maxWidthClasses = {
        sm: 'max-w-sm',
        md: 'max-w-2xl',
        lg: 'max-w-4xl',
        xl: 'max-w-6xl',
        full: 'max-w-full',
    };

    return (
        <div
            className="fixed inset-0 flex items-center justify-center p-4 transition-opacity duration-entering"
            style={{ zIndex: 'var(--md-z-index-modal)' }}
            onClick={handleBackdropClick}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
        >
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in pointer-events-none"
                aria-hidden="true"
            />

            {/* Modal Container */}
            <div
                ref={modalRef}
                className={`
          relative w-full
          ${fullScreen ? 'h-full max-w-full' : `${maxWidthClasses[maxWidth]} max-h-[90vh]`}
          bg-brown-100 rounded-xl
          shadow-elevation-24 
          animate-scale-in
          flex flex-col
          overflow-hidden
          border border-brown-300
        `}
            >
                {/* Header */}
                {(title || showCloseButton) && (
                    <div className="flex items-center justify-between px-6 py-4 border-b border-brown-800 bg-brown-950 rounded-t-xl">
                        {title && (
                            <h2
                                id="modal-title"
                                className="text-xl md:text-2xl font-bold text-white tracking-tight"
                            >
                                {title}
                            </h2>
                        )}
                        {showCloseButton && (
                            <button
                                onClick={onClose}
                                className="ml-auto p-2 rounded-full hover:bg-brown-800 transition-all duration-shorter ripple text-brown-400 hover:text-white"
                                aria-label="Fechar modal"
                            >
                                <X size={24} />
                            </button>
                        )}
                    </div>
                )}

                {/* Content */}
                <div className="flex-1 overflow-y-auto px-6 py-6">
                    {children}
                </div>

                {/* Actions (Footer) */}
                {actions && (
                    <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-brown-800">
                        {actions}
                    </div>
                )}
            </div>

            {/* Animations (inline styles) */}
            <style>{`
        @keyframes fade-in {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }

        @keyframes scale-in {
          from {
            opacity: 0;
            transform: scale(0.9);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }

        .animate-fade-in {
          animation: fade-in var(--md-duration-entering) var(--md-easing-deceleration);
        }

        .animate-scale-in {
          animation: scale-in var(--md-duration-entering) var(--md-easing-deceleration);
        }
      `}</style>
        </div>
    );
};

export default Modal;
