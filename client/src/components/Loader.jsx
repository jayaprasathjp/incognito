import React from 'react';

const Loader = () => {
    return (
        <div className="flex flex-col items-center justify-center min-h-[200px] w-full gap-4">
            <div className="relative w-12 h-12">
                <div className="absolute top-0 left-0 w-full h-full border-4 border-slate-200 rounded-full"></div>
                <div className="absolute top-0 left-0 w-full h-full border-4 border-slate-900 rounded-full animate-spin border-t-transparent"></div>
            </div>
            <p className="text-slate-500 text-sm font-medium animate-pulse tracking-wide uppercase">
                Loading...
            </p>
        </div>
    );
};

export default Loader;
