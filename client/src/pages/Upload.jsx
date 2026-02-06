import { Link } from 'react-router-dom';
import appIcon from '../assets/app-icon.png';

const Upload = () => {
    return (
        <div className="min-h-screen bg-white text-slate-900 font-sans p-6">
             {/* Header */}
             <div className="flex justify-between items-center mb-12 relative">
                <Link to="/dashboard" className="text-slate-900 focus:outline-none absolute left-0">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                    </svg>
                </Link>
                <div className="w-full flex justify-center">
                    <img src={appIcon} alt="Logo" className="w-12 h-12 object-contain drop-shadow-md" />
                </div>
            </div>

            {/* Page Title */}
            <div className="text-center mb-10">
                 <h1 className="text-xl font-light text-slate-900 uppercase tracking-[0.2em]">UPLOAD</h1>
            </div>

            {/* Upload Area */}
            <div className="max-w-sm mx-auto">
                <div className="w-full aspect-square border-2 border-dashed border-slate-300 rounded-2xl flex flex-col items-center justify-center bg-slate-50 text-slate-400 mb-8 hover:bg-white hover:border-slate-400 hover:shadow-lg transition-all cursor-pointer group">
                    <div className="mb-4 text-slate-300 group-hover:text-slate-600 transition-colors transform group-hover:scale-110 duration-300">
                         <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                    </div>
                    <p className="text-sm font-bold text-slate-600 group-hover:text-slate-900 transition-colors">Click to upload files</p>
                    <p className="text-xs mt-2 opacity-50 font-medium">PNG, JPG, or PDF</p>
                </div>

                {/* Submit Button */}
                <button className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold shadow-lg hover:bg-slate-800 transition-transform active:scale-95 uppercase tracking-widest text-xs">
                    Submit Upload
                </button>
            </div>
        </div>
    );
};

export default Upload;
