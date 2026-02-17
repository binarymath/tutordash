import React from 'react';

const Button = ({
    children,
    onClick,
    variant = 'contained',
    color = 'primary',
    size = 'medium',
    disabled = false,
    fullWidth = false,
    startIcon,
    endIcon,
    type = 'button',
    className = '',
    ...props
}) => {
    // Base button classes
    const baseClasses = 'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-shorter ripple focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

    // Size variants
    const sizeClasses = {
        small: 'px-3 py-1.5 text-sm',
        medium: 'px-4 py-2 text-base',
        large: 'px-6 py-3 text-lg',
    };

    // Variant + Color combinations for LIGHT THEME
    const variantClasses = {
        contained: {
            primary: 'bg-brown-600 text-white hover:bg-brown-700 focus:ring-brown-500 shadow-elevation-2 hover:shadow-elevation-4',
            accent: 'bg-accent-gold text-brown-900 hover:bg-amber-500 focus:ring-accent-gold shadow-elevation-2 hover:shadow-elevation-4 font-semibold',
            success: 'bg-accent-green text-white hover:bg-green-600 focus:ring-accent-green shadow-elevation-2 hover:shadow-elevation-4',
            error: 'bg-accent-red text-white hover:bg-red-600 focus:ring-accent-red shadow-elevation-2 hover:shadow-elevation-4',
        },
        outlined: {
            primary: 'border-2 border-brown-600 text-brown-700 hover:bg-brown-100 focus:ring-brown-500',
            accent: 'border-2 border-accent-gold text-brown-800 hover:bg-amber-50 focus:ring-accent-gold',
            success: 'border-2 border-accent-green text-green-700 hover:bg-green-50 focus:ring-accent-green',
            error: 'border-2 border-accent-red text-red-700 hover:bg-red-50 focus:ring-accent-red',
        },
        text: {
            primary: 'text-brown-700 hover:bg-brown-100 focus:ring-brown-500',
            accent: 'text-brown-800 hover:bg-amber-50 focus:ring-accent-gold font-semibold',
            success: 'text-green-700 hover:bg-green-50 focus:ring-accent-green',
            error: 'text-red-700 hover:bg-red-50 focus:ring-accent-red',
        },
    };

    const widthClass = fullWidth ? 'w-full' : '';

    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled}
            className={`
        ${baseClasses}
        ${sizeClasses[size]}
        ${variantClasses[variant][color]}
        ${widthClass}
        ${className}
      `}
            {...props}
        >
            {startIcon && <span className="mr-2">{startIcon}</span>}
            {children}
            {endIcon && <span className="ml-2">{endIcon}</span>}
        </button>
    );
};

export default Button;
