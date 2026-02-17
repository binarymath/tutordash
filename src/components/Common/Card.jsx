import React from 'react';

const Card = ({ children, className = '', hover = true, onClick }) => {
    return (
        <div
            onClick={onClick}
            className={`
                bg-white/80 backdrop-blur-sm
                border border-brown-300 
                rounded-2xl p-6 
                shadow-elevation-2
                transition-all duration-300 ease-in-out
                ${hover ? 'hover:shadow-elevation-4 hover:border-brown-400 hover:-translate-y-0.5' : ''}
                ${onClick ? 'cursor-pointer' : ''}
                ${className}
            `}
        >
            {children}
        </div>
    );
};

export default Card;
