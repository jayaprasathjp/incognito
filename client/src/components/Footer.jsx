import { useLocation } from 'react-router-dom';
import sponsorLogo from '../assets/sponsor/1.png';

const Footer = () => {
    const location = useLocation();
    
    // Don't show footer on admin pages
    if (location.pathname.startsWith('/admin')) {
        return null;
    }

    return (
        <footer className="w-full bg-white/95 backdrop-blur-sm text-slate-500 py-2 text-center border-t border-slate-100 z-10 relative">
            <div className="container mx-auto px-6">
                <div className="flex flex-col items-center justify-center">
                    
                    {/* Compact Sponsor Section */}
                    <div className="flex items-center justify-center">
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Sponsored by</span>
                        <img 
                            src={sponsorLogo} 
                            alt="Partner Logo" 
                            className="h-10 md:h-10 w-auto object-contain" 
                        />
                    </div>

                    {/* Legal Text */}
                    <p className="text-[10px] md:text-xs font-medium tracking-widest uppercase opacity-60 max-w-2xl leading-relaxed mb-2">
                        "Konami and eFootball are registered trademarks of their respective owners. <br className="hidden md:block"/>This event is independently organized."
                    </p>
                    
                    {/* Copyright */}
                    <p className="text-[10px] text-slate-400">
                        © {new Date().getFullYear()} Incøgnitø League. All rights reserved.
                    </p>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
