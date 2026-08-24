/**
 * Smart Food Wastage Analyser — application routes.
 *
 *   /login          student sign-in
 *   /admin/login    mess staff sign-in
 *   /student/*      student portal   (guarded, role: student)
 *   /admin/*        mess staff portal (guarded, role: admin)
 *
 * Both role trees hang off the same AuthProvider and the same ProtectedRoute,
 * so adding the student half did not touch how the staff half authenticates.
 */

import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, homePathForRole, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import ProtectedRoute from './components/ProtectedRoute';

import LoginStudent from './pages/LoginStudent';
import LoginAdmin from './pages/LoginAdmin';
import NotFound from './pages/NotFound';

import StudentLayout from './components/student/StudentLayout';
import StudentDashboard from './pages/student/StudentDashboard';
import StudentMeals from './pages/student/StudentMeals';
import StudentHistory from './pages/student/StudentHistory';
import StudentNotifications from './pages/student/StudentNotifications';
import StudentProfile from './pages/student/StudentProfile';

import AdminLayout from './components/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminPredictions from './pages/admin/AdminPredictions';
import AdminAttendance from './pages/admin/AdminAttendance';
import AdminAnalytics from './pages/admin/AdminAnalytics';

import './styles/student.css';
import './styles/admin.css';

/** Sends visitors at "/" to their own portal, or to the student sign-in. */
function RootRedirect() {
  const { isAuthenticated, role, bootstrapping } = useAuth();
  if (bootstrapping) return null;
  return <Navigate to={isAuthenticated ? homePathForRole(role) : '/login'} replace />;
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Routes>
          <Route path="/" element={<RootRedirect />} />

          <Route path="/login" element={<LoginStudent />} />
          <Route path="/admin/login" element={<LoginAdmin />} />

          {/* ---------------- Student portal ---------------- */}
          <Route element={<ProtectedRoute role="student" loginPath="/login" />}>
            <Route path="/student" element={<StudentLayout />}>
              <Route index element={<Navigate to="/student/dashboard" replace />} />
              <Route path="dashboard" element={<StudentDashboard />} />
              <Route path="meals" element={<StudentMeals />} />
              <Route path="history" element={<StudentHistory />} />
              <Route path="notifications" element={<StudentNotifications />} />
              <Route path="profile" element={<StudentProfile />} />
            </Route>
          </Route>

          {/* ---------------- Mess staff portal ---------------- */}
          <Route element={<ProtectedRoute role="admin" loginPath="/admin/login" />}>
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="predictions" element={<AdminPredictions />} />
              <Route path="attendance" element={<AdminAttendance />} />
              <Route path="analytics" element={<AdminAnalytics />} />
            </Route>
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
      </ToastProvider>
    </AuthProvider>
  );
}
