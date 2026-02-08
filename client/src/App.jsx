import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';

import Welcome from './pages/Welcome';
import Leaderboard from './pages/Leaderboard';
import TournamentDetails from './pages/TournamentDetails';
import PlayerDashboard from './pages/PlayerDashboard';
import Roadmap from './pages/Roadmap';
import Rules from './pages/Rules';
import MyFixtures from './pages/MyFixtures';
import Upload from './pages/Upload';
import LeagueBracket from './pages/LeagueBracket';
import ReferralProgram from './pages/ReferralProgram';
import BankDetails from './pages/BankDetails';

import AdminLayout from './layouts/AdminLayout';
import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';
import PlayerManagement from './pages/admin/PlayerManagement';
import TournamentControl from './pages/admin/TournamentControl';
import Matches from './pages/admin/Matches';
import Disputes from './pages/admin/Disputes';
import Payments from './pages/admin/Payments';
import Announcements from './pages/admin/Announcements';

import { Toaster } from 'react-hot-toast';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" toastOptions={{
          style: {
            background: '#1a1a20',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.1)'
          }
        }} />
        <Routes>
          <Route path="/" element={<Welcome />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          
          {/* Admin Routes */}
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
             <Route path="/roadmap" element={<Roadmap />} />
             <Route path="/rules" element={<Rules />} />
             <Route path="/fixtures" element={<MyFixtures />} />
             <Route path="/upload" element={<Upload />} />
             <Route path="/bracket" element={<LeagueBracket />} />
             <Route path="/referral" element={<ReferralProgram />} />
             <Route path="/bank-details" element={<BankDetails />} />
             <Route path="/tournament/:id" element={<TournamentDetails />} />
          </Route>

          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
