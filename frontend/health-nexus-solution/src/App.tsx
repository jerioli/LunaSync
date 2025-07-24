import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { BrandingProvider } from "./contexts/BrandingContext";
import { ClinicProvider, useClinic } from "./contexts/ClinicContext";
import { LanguageProvider } from "./contexts/LanguageContext";
import { ThemeProvider } from "./contexts/ThemeContext";

import { AppLayout } from "./components/layout/AppLayout";
import AddPatient from "./components/patients/AddPatient_clean";
import Appointments from "./pages/Appointments";
import AppointmentScheduling from "./pages/AppointmentScheduling";
import ChangePassword from "./pages/ChangePassword";
import Dashboard from "./pages/Dashboard";
import ForgotPassword from "./pages/ForgotPassword";
import Index from "./pages/Index";
import LabResults from "./pages/LabResults";
import Login from "./pages/Login";
import MedicalCertificateGeneration from "./pages/MedicalCertificateGeneration";
import MedicalCertificateManagement from "./pages/MedicalCertificateManagement";
import NotFound from "./pages/NotFound";
import PatientManagement from "./pages/PatientManagement";
import PatientPortal from "./pages/PatientPortal";
import PatientsList from "./pages/PatientsList";
import PrescriptionManagement from "./pages/PrescriptionManagement";
import Prescriptions from "./pages/Prescriptions";
import ResetPassword from "./pages/ResetPassword";
import Schedule from "./pages/Schedule";
import Settings from "./pages/Settings";
import Staff from "./pages/Staff";
import UserSettings from "./pages/UserSettings";

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
        <LanguageProvider defaultLanguage="en" storageKey="health-nexus-language">
          <BrandingProvider>
            <ClinicProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
          <Routes>
            {/* Initial landing/routing page */}
            <Route path="/index" element={<Index />} />
            
            {/* Public patient portal */}
            <Route path="/portal" element={<PatientPortal />} />
            
            {/* Patient appointment scheduling */}
            <Route path="/portal/appointment" element={<AppointmentScheduling />} />
            
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
            
            {/* Change password for first-time users */}
            <Route path="/change-password" element={
              <ProtectedRoute>
                <ChangePassword />
              </ProtectedRoute>
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
            
            {/* Medical Certificate Management route */}
            <Route path="/medical-certificates" element={
              <ProtectedRoute>
                <AppLayout>
                  <MedicalCertificateManagement />
                </AppLayout>
              </ProtectedRoute>
            } />
            
            {/* Medical Certificate Generation route */}
            <Route path="/patients/certificate-generate" element={
              <ProtectedRoute>
                <AppLayout>
                  <MedicalCertificateGeneration />
                </AppLayout>
              </ProtectedRoute>
            } />
            
            {/* Prescription Management route */}
            <Route path="/prescription-management" element={
              <ProtectedRoute>
                <AppLayout>
                  <PrescriptionManagement />
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

            {/* Add new patient route */}
            <Route path="/patients/add" element={
              <AppLayout>
                <AddPatient />
              </AppLayout>
            } />
          </Routes>
        </BrowserRouter>
      </ClinicProvider>
      </BrandingProvider>
      </LanguageProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
