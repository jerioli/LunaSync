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
import AuditLogs from "./pages/AuditLogs";
import ChangePassword from "./pages/ChangePassword";
import Dashboard from "./pages/Dashboard";
import DocumentComparison from "./pages/DocumentComparison";
import ForgotPassword from "./pages/ForgotPassword";
import Index from "./pages/Index";
import Integrations from "./pages/Integrations";
import LabResults from "./pages/LabResults";
import Login from "./pages/Login";
import MedicalCertificateGeneration from "./pages/MedicalCertificateGeneration";
import MedicalCertificateManagement from "./pages/MedicalCertificateManagement";
import NotFound from "./pages/NotFound";
import PatientManagement from "./pages/PatientManagement";
import PatientPortal from "./pages/PatientPortal";
import PatientsList from "./pages/PatientsList";
import PermissionManagement from "./pages/PermissionManagement";
import PrescriptionManagement from "./pages/PrescriptionManagement";
import Prescriptions from "./pages/Prescriptions";
import ResetPassword from "./pages/ResetPassword";
import Schedule from "./pages/Schedule";
import SecurityTesting from "./pages/SecurityTesting";
import Settings from "./pages/Settings";
import Staff from "./pages/Staff";
import UsageReports from "./pages/UsageReports";
import UserSettings from "./pages/UserSettings";

// Auth route guard component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { currentUser } = useClinic();
  
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }
  
  // Check if user needs to change password - redirect to change password page
  if (currentUser.force_password_change) {
    return <Navigate to="/change-password" replace />;
  }
  
  return <>{children}</>;
};

// Password change route (for users who need to change password after login)
const PasswordChangeRoute = ({ children }: { children: React.ReactNode }) => {
  const { currentUser } = useClinic();
  
  // Allow access if user is authenticated (even if they need password change)
  if (!currentUser) {
    return <Navigate to="/login" replace />;
  }
  
  // If user doesn't need password change, redirect to dashboard
  if (!currentUser.force_password_change) {
    return <Navigate to="/" replace />;
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
            
            {/* Reset password (OTP-based) */}
            <Route path="/reset-password" element={
              <PublicRoute>
                <ResetPassword />
              </PublicRoute>
            } />
            
            {/* Reset password (Email link-based) */}
            <Route path="/reset-password/:uidb64/:token" element={
              <PublicRoute>
                <ResetPassword />
              </PublicRoute>
            } />
            
            {/* Change password for first-time users */}
            <Route path="/change-password" element={
              <PasswordChangeRoute>
                <ChangePassword />
              </PasswordChangeRoute>
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
            
            {/* Superadmin routes */}
            <Route path="/permissions" element={
              <ProtectedRoute>
                <AppLayout>
                  <PermissionManagement />
                </AppLayout>
              </ProtectedRoute>
            } />
            
            <Route path="/audit-logs" element={
              <ProtectedRoute>
                <AppLayout>
                  <AuditLogs />
                </AppLayout>
              </ProtectedRoute>
            } />
            
            <Route path="/usage-reports" element={
              <ProtectedRoute>
                <AppLayout>
                  <UsageReports />
                </AppLayout>
              </ProtectedRoute>
            } />
            
            <Route path="/integrations" element={
              <ProtectedRoute>
                <AppLayout>
                  <Integrations />
                </AppLayout>
              </ProtectedRoute>
            } />
            
            <Route path="/security-testing" element={
              <ProtectedRoute>
                <AppLayout>
                  <SecurityTesting />
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
            
            {/* Document Comparison route */}
            <Route path="/document-comparison" element={
              <ProtectedRoute>
                <AppLayout>
                  <DocumentComparison />
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
