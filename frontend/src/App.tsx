import { Routes, Route } from "react-router-dom";
// import { useEffect } from "react";
// import { socket } from "../src/apis/socket";

import Login from "./pages/auth/LoginPage";
import Register from "./pages/auth/Register";
import Dashboard from "./pages/DashboardPage";
import ForgotPassword from "./pages/auth/ForgotPassword";
import VerifyEmail from "./pages/auth/VerifyEmail";
import ProtectedRoute from "./routes/ProtectedRoute";
import ResetPassword from "./pages/auth/ResetPassword";
import Home from "./pages/HomePage";
import ProfilePage from "./pages/profile/ProfilePage";
import NotificationsPage from "./pages/NotificationsPage";
import PublicRoute from "./routes/PublicRoute";
import CallWindow from "./components/call/CallWindow";

function App() {

  return (
    <>
    <Routes>
      <Route path="/" element={<PublicRoute><Home /></PublicRoute>} />
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
      <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
      <Route path="/reset-password" element={<PublicRoute><ResetPassword /></PublicRoute>} />
      <Route path="/verify-email" element={<PublicRoute><VerifyEmail /></PublicRoute>} />

      <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
      <Route path="/notifications" element={<ProtectedRoute><NotificationsPage /></ProtectedRoute>} />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
    </Routes>
      <CallWindow />
      </>
    
  );
}

export default App;
