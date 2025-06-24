import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ClinicProvider, useClinic } from "./contexts/ClinicContext";
import { ThemeProvider } from "./contexts/ThemeContext";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import PatientPortal from "./pages/PatientPortal";
import PatientsList from "./pages/PatientsList";
import PatientManagement from "./pages/PatientManagement";
import AddPatient from "./components/patients/AddPatient";
import LabResults from "./pages/LabResults";
import Appointments from "./pages/Appointments";
import Prescriptions from "./pages/Prescriptions";
import Schedule from "./pages/Schedule";
import Staff from "./pages/Staff";
import Settings from "./pages/Settings";
import UserSettings from "./pages/UserSettings";
import { AppLayout } from "./components/layout/AppLayout";
import NotFound from "./pages/NotFound";
import Index from "./pages/Index";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";

// Auth route guard component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { currentUser } = useClinic();
  
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
};

// Redirect staff to proper dashboard
const StaffRoute = ({ children }: { children: React.ReactNode }) => {
  const { currentUser } = useClinic();
  
  if (currentUser) {
    return <Navigate to="/" replace />;
  }
  
  return <>{children}</>;
};

// Public route for password reset
const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

const App = () => {
  // Create a new QueryClient instance inside the component
  const queryClient = new QueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="system" storageKey="health-nexus-theme">
        <ClinicProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              {/* Initial landing/routing page */}
              <Route path="/index" element={<Index />} />
              
              {/* Public patient portal */}
              <Route path="/portal" element={<PatientPortal />} />
              
              {/* Staff login */}
              <Route path="/login" element={
                <StaffRoute>
                  <Login />
                </StaffRoute>
              } />
              
              {/* Forgot password */}
              <Route path="/forgot-password" element={
                <StaffRoute>
                  <ForgotPassword />
                </StaffRoute>
              } />
              
              {/* Reset password */}
              <Route path="/reset-password/:uidb64/:token" element={
                <PublicRoute>
                  <ResetPassword />
                </PublicRoute>
              } />
              
              {/* Staff protected routes */}
              <Route path="/" element={
                <ProtectedRoute>
                  <AppLayout>
                    <Dashboard />
                  </AppLayout>
                </ProtectedRoute>
              } />
              
              {/* Patient management routes */}
              <Route path="/patients" element={
                <ProtectedRoute>
                  <AppLayout>
                    <PatientsList />
                  </AppLayout>
                </ProtectedRoute>
              } />
              
              <Route path="/patients/add" element={
                <ProtectedRoute>
                  <AppLayout>
                    <AddPatient />
                  </AppLayout>
                </ProtectedRoute>
              } />
              
              <Route path="/patients/:id" element={
                <ProtectedRoute>
                  <AppLayout>
                    <PatientManagement />
                  </AppLayout>
                </ProtectedRoute>
              } />
              
              {/* Appointments route */}
              <Route path="/appointments" element={
                <ProtectedRoute>
                  <AppLayout>
                    <Appointments />
                  </AppLayout>
                </ProtectedRoute>
              } />
              
              {/* Doctor schedule route */}
              <Route path="/schedule" element={
                <ProtectedRoute>
                  <AppLayout>
                    <Schedule />
                  </AppLayout>
                </ProtectedRoute>
              } />
              
              {/* Prescriptions route */}
              <Route path="/prescriptions" element={
                <ProtectedRoute>
                  <AppLayout>
                    <Prescriptions />
                  </AppLayout>
                </ProtectedRoute>
              } />
              
              {/* Staff management route for admin */}
              <Route path="/staff" element={
                <ProtectedRoute>
                  <AppLayout>
                    <Staff />
                  </AppLayout>
                </ProtectedRoute>
              } />
              
              {/* Settings route for admin */}
              <Route path="/settings" element={
                <ProtectedRoute>
                  <AppLayout>
                    <Settings />
                  </AppLayout>
                </ProtectedRoute>
              } />
              
              {/* User Settings route for staff members */}
              <Route path="/user-settings" element={
                <ProtectedRoute>
                  <AppLayout>
                    <UserSettings />
                  </AppLayout>
                </ProtectedRoute>
              } />
              
              {/* Lab Results route */}
              <Route path="/lab-results" element={
                <ProtectedRoute>
                  <AppLayout>
                    <LabResults />
                  </AppLayout>
                </ProtectedRoute>
              } />
              
              {/* 404 route */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </ClinicProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;