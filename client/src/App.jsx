import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';

import Welcome from './pages/Welcome';
import Leaderboard from './pages/Leaderboard';
import TournamentDetails from './pages/TournamentDetails';
import AdminDashboard from './pages/AdminDashboard';
import PlayerDashboard from './pages/PlayerDashboard';
import Roadmap from './pages/Roadmap';
import Rules from './pages/Rules';
import MyFixtures from './pages/MyFixtures';
import Upload from './pages/Upload';
import LeagueBracket from './pages/LeagueBracket';
import ReferralProgram from './pages/ReferralProgram';
import BankDetails from './pages/BankDetails';

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Welcome />} />
          <Route path="/leaderboard" element={<Leaderboard />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          <Route element={<ProtectedRoute role="admin" />}>
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/tournament/:id" element={<TournamentDetails />} />
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
