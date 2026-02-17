import React from 'react';

export default function Card({ children, hover = false, onClick, className = '' }) {
    return (
        <div
            onClick={onClick}
            className={`
                bg-brown-900/95 backdrop-blur-sm
                border border-brown-700 
                rounded-2xl p-6 
                shadow-elevation-4
                transition-all duration-300 ease-in-out
                text-white
                ${hover ? 'hover:shadow-elevation-8 hover:border-brown-600 hover:-translate-y-0.5' : ''}
                ${onClick ? 'cursor-pointer' : ''}
                ${className}
            `}
        >
            {children}
        </div>
    );
};
