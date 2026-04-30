import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Lock, User, Eye, EyeOff } from "lucide-react";
import toast from "react-hot-toast";
import { api } from "../../utils/api";

const AdminLogin = () => {
    const [formData, setFormData] = useState({ identifier: "", password: "" });
    const { login } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});
    const [showPassword, setShowPassword] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setErrors({});
        try {
            const data = await api.post('/auth/login', formData);

            if (data.token) {
                if (data.user.role === 'admin') {
                    login(data.token, data.user);
                    toast.success("Welcome back, Admin!");
                    navigate("/admin/dashboard");
                } else {
                    toast.error("Access Denied: Admins Only");
                }
            }
        } catch (err) {
            const data = err.response?.data;
            if (data?.field) {
                setErrors({ [data.field]: data.error });
            } else {
                setErrors({ submit: data?.error || "Login Failed" });
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 relative overflow-hidden">
            {/* Background elements */}
            <div className="absolute top-0 left-0 w-full h-full bg-[url('/grid.svg')] opacity-5 pointer-events-none"></div>
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-200/40 rounded-full blur-[100px]"></div>
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-200/40 rounded-full blur-[100px]"></div>

            <div className="w-full max-w-sm p-6 md:p-8 bg-white rounded-2xl relative z-10 shadow-xl border border-slate-100">
                <div className="text-center mb-10">
                    <h1 className="text-3xl font-bold text-slate-900 mb-2">Admin Portal</h1>
                    <p className="text-slate-500">Secure access for tournament management</p>
                </div>

                {errors.submit && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm text-center mb-6 border border-red-100">
                        {errors.submit}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="flex flex-col gap-1">
                        <label className="text-sm font-medium text-slate-600 ml-1">Email or Alias</label>
                        <div className="flex flex-col gap-1">
                            <div className="relative">
                                <User className={`absolute left-4 top-1/2 -translate-y-1/2 ${errors.identifier ? 'text-red-400' : 'text-slate-400'}`} size={20} />
                                <input
                                    type="text"
                                    className={`w-full pl-12 pr-4 py-3 bg-white border rounded-xl text-slate-900 focus:outline-none transition-colors shadow-sm ${errors.identifier ? 'border-red-500 focus:border-red-500' : 'border-slate-200 focus:border-blue-500'}`}
                                    placeholder="Enter your credentials"
                                    value={formData.identifier}
                                    onChange={(e) => setFormData({ ...formData, identifier: e.target.value })}
                                    required
                                />
                            </div>
                            {errors.identifier && <span className="text-xs text-red-500 ml-1">{errors.identifier}</span>}
                        </div>
                    </div>

                    <div className="flex flex-col gap-1">
                        <label className="text-sm font-medium text-slate-600 ml-1">Password</label>
                        <div className="flex flex-col gap-1">
                            <div className="relative">
                                <Lock className={`absolute left-4 top-1/2 -translate-y-1/2 ${errors.password ? 'text-red-400' : 'text-slate-400'}`} size={20} />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    className={`w-full pl-12 pr-12 py-3 bg-white border rounded-xl text-slate-900 focus:outline-none transition-colors shadow-sm ${errors.password ? 'border-red-500 focus:border-red-500' : 'border-slate-200 focus:border-blue-500'}`}
                                    placeholder="••••••••"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 focus:outline-none"
                                >
                                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                            {errors.password && <span className="text-xs text-red-500 ml-1">{errors.password}</span>}
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 bg-slate-900 text-white font-bold rounded-xl shadow-lg hover:bg-slate-800 transition-all active:scale-95 flex items-center justify-center gap-2"
                    >
                        {loading ? "Verifying..." : (
                            <>
                                Login <ArrowRight size={20} />
                            </>
                        )}
                    </button>
                    
                    <div className="text-center mt-4">
                        <Link to="/login" className="text-sm text-slate-500 hover:text-blue-600 transition-colors">
                            Wait, I'm a player
                        </Link>
                    </div>
                </form>
            </div>
        </div>

    );
};

export default AdminLogin;
