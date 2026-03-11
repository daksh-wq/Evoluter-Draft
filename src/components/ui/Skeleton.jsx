import React from 'react';

const Skeleton = ({ className, ...props }) => {
    return (
        <div
            className={`animate-pulse bg-slate-200 rounded-md ${className}`}
            {...props}
        />
    );
};

export { Skeleton };
