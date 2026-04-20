import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';

import Welcome from './pages/Welcome';
import Leaderboard from './pages/Leaderboard';
import TournamentDetails from './pages/TournamentDetails';
import PlayerDashboard from './pages/PlayerDashboard';
import PlayerAnnouncements from './pages/PlayerAnnouncements';
import Roadmap from './pages/Roadmap';
import Rules from './pages/Rules';
import MyMatches from './pages/MyMatches';
import ReferralProgram from './pages/ReferralProgram';
import BankDetails from './pages/BankDetails';
import ActiveMatch from './pages/ActiveMatch';

import AdminLayout from './layouts/AdminLayout';
import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';
import PlayerManagement from './pages/admin/PlayerManagement';
import TournamentControl from './pages/admin/TournamentControl';
import Matches from './pages/admin/Matches';
import Disputes from './pages/admin/Disputes';
import Payments from './pages/admin/Payments';
import Announcements from './pages/admin/Announcements';

import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { Toaster } from 'react-hot-toast';
import Footer from './components/Footer';
import ConnectivityToast from './components/ConnectivityToast';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Analytics />
        <SpeedInsights />
        <div className="flex flex-col min-h-screen">
          <ConnectivityToast />
          <Toaster position="top-right" toastOptions={{
            style: {
              background: '#1a1a20',
              color: '#fff',
              border: '1px solid rgba(255,255,255,0.1)'
            }
          }} />
          <div className="flex-grow">
            <Routes>
              <Route path="/" element={<Welcome />} />
              <Route path="/leaderboard" element={<Leaderboard />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password/:token" element={<ResetPassword />} />

              
              {/* Admin Routes */}
              {/* Public Info Pages - Not Protected for SEO */}
              <Route path="/roadmap" element={<Roadmap />} />
              <Route path="/rules" element={<Rules />} />
              <Route path="/admin/login" element={<AdminLogin />} />
              <Route path="/admin" element={<AdminLayout />}>
                  <Route index element={<Navigate to="/admin/dashboard" replace />} />
                  <Route path="dashboard" element={<AdminDashboard />} />
                  <Route path="players" element={<PlayerManagement />} />
                  <Route path="tournament" element={<TournamentControl />} />
                  <Route path="matches" element={<Matches />} />
                  <Route path="disputes" element={<Disputes />} />
                  <Route path="payments" element={<Payments />} />
                  <Route path="announcements" element={<Announcements />} />
              </Route>

              <Route element={<ProtectedRoute />}>
                 <Route path="/dashboard" element={<PlayerDashboard />} />
                 <Route path="/announcements" element={<PlayerAnnouncements />} />
                 <Route path="/matches" element={<MyMatches />} />
                 <Route path="/referral" element={<ReferralProgram />} />
                 <Route path="/bank-details" element={<BankDetails />} />
                 <Route path="/tournament/:id" element={<TournamentDetails />} />
              </Route>

              <Route path="*" element={<Navigate to="/login" />} />
            </Routes>
          </div>
          <Footer />
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
