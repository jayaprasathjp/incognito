import { Link } from 'react-router-dom';
import appIcon from '../assets/app-icon.png';

const Welcome = () => {
    return (
        <div className="min-h-screen flex flex-col items-center justify-between p-6 bg-white text-slate-900 font-sans" style={{ backgroundColor: '#ffffff', color: '#0f172a' }}>
            {/* Top Section: Logo & Branding */}
            <div className="flex-1 flex flex-col items-center justify-center w-full mt-10">
                <div className="mb-6">
                     <img src={appIcon} alt="Incognito Logo" className="w-24 h-24 object-contain drop-shadow-xl" />
                </div>
                
                <h1 className="text-4xl font-light tracking-[0.2em] text-slate-900 mb-2">
                    INCØGNITØ
                </h1>
                
                <p className="text-slate-600 text-lg font-medium text-center">
                    Play anonymously, Win publicly.
                </p>
            </div>

            {/* Middle Section: Actions */}
            <div className="w-full max-w-md space-y-4 mb-10">
                <Link to="/register" className="block w-full">
                    <button className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold shadow-lg hover:bg-slate-800 transition-all">
                        <div className="text-lg">REGISTER NOW</div>
                        <div className="text-xs font-normal opacity-80">(Compete & Win)</div>
                    </button>
                </Link>

                <Link to="/leaderboard" className="block w-full">
                     <button className="w-full bg-white text-slate-900 border-2 border-slate-200 py-4 rounded-xl font-bold shadow-sm hover:bg-gray-50 transition-all">
                        <div className="text-lg">SPECTATOR</div>
                        <div className="text-xs font-normal text-slate-500">(Watch the game)</div>
                    </button>
                </Link>

                <div className="text-center mt-6">
                    <span className="text-slate-500">Already registered? </span>
                    <Link to="/login" className="text-blue-600 font-semibold hover:underline">
                        Log in
                    </Link>
                </div>
            </div>

            {/* Bottom Section: Footer */}
            <div className="w-full text-center space-y-6 mb-4">
                <div className="flex justify-center gap-6 text-sm text-slate-500">
                    <a href="#" className="hover:text-slate-900">About</a>
                    <a href="#" className="hover:text-slate-900">Contact us</a>
                    <a href="#" className="hover:text-slate-900">Follow our socials</a>
                </div>
                
                <div className="text-xs text-slate-400">
                    © Play Incøgnitø 2026
                </div>
            </div>
        </div>
    );
};

export default Welcome;
