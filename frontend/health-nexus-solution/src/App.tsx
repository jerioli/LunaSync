import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { BrandingProvider } from "./contexts/BrandingContext";
import { ClinicProvider, useClinic } from "./contexts/ClinicContext";
import { ThemeProvider } from "./contexts/ThemeContext";

import AccountActivation from "./components/AccountActivation";
import { AppLayout } from "./components/layout/AppLayout";
import AddPatient from "./components/patients/AddPatient_clean";
import ReceptionistScheduler from "./components/scheduling/ReceptionistScheduler";
import Appointments from "./pages/Appointments";
import AppointmentScheduling from "./pages/AppointmentScheduling";
import AuditLogs from "./pages/AuditLogs";
import ChangePassword from "./pages/ChangePassword";
import DocumentComparison from "./pages/DocumentComparison";
import ForgotPassword from "./pages/ForgotPassword";
import Index from "./pages/Index";
import Inventory from "./pages/Inventory";
import LabResults from "./pages/LabResults";
import Login from "./pages/Login";
import MedicalCertificateGeneration from "./pages/MedicalCertificateGeneration";
import MedicalCertificateManagement from "./pages/MedicalCertificateManagement";
import NotFound from "./pages/NotFound";
import PatientManagement from "./pages/PatientManagement";
import PatientPortal from "./pages/PatientPortal";

import { Toaster } from "./components/ui/toaster";
import PatientsList from "./pages/PatientsList";
import PermissionManagement from "./pages/PermissionManagement";
import PrescriptionManagement from "./pages/PrescriptionManagement";
import Prescriptions from "./pages/Prescriptions";
import ResetPassword from "./pages/ResetPassword";
import Schedule from "./pages/Schedule";
import Settings from "./pages/Settings";
import Staff from "./pages/Staff";
import UserSettings from "./pages/UserSettings";

// PermissionGuard component for route-level permission checks
const PermissionGuard = ({
  permission,
  children,
}: {
  permission: string;
  children: React.ReactNode;
}) => {
  const { currentUser, isAuthLoading } = useClinic();
  
  // Show loading while authentication is still loading
  if (isAuthLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }
  
  if (!currentUser) {
    return (
      <div className="flex items-center justify-center h-full">
        <h2 className="text-xl font-bold">403 Forbidden</h2>
        <p>You do not have access to this page.</p>
      </div>
    );
  }

  // Special handling for inventory permission - allow doctors and admins by default
  if (permission === "can_manage_inventory") {
    const hasAccess = 
      currentUser.role === "doctor" || 
      currentUser.role === "admin" || 
      currentUser[permission];
    
    if (!hasAccess) {
      return (
        <div className="flex items-center justify-center h-full">
          <h2 className="text-xl font-bold">403 Forbidden</h2>
          <p>You do not have access to this page.</p>
        </div>
      );
    }
  } else {
    // For other permissions, use the standard check
    if (!currentUser[permission]) {
      return (
        <div className="flex items-center justify-center h-full">
          <h2 className="text-xl font-bold">403 Forbidden</h2>
          <p>You do not have access to this page.</p>
        </div>
      );
    }
  }
  
  return <>{children}</>;
};

// Auth route guard component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { currentUser, isAuthLoading } = useClinic();

  // Show loading while checking authentication
  if (isAuthLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

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
  const { currentUser, isAuthLoading } = useClinic();

  // Show loading while checking authentication
  if (isAuthLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

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
  const { currentUser, isAuthLoading } = useClinic();

  // Show loading while checking authentication
  if (isAuthLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  // If user is authenticated, redirect to dashboard
  if (currentUser) {
    return <Navigate to="/" replace />;
  }

  // Otherwise, show the login page
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
      <ThemeProvider defaultTheme="light" storageKey="health-nexus-theme">
        <BrandingProvider>
          <ClinicProvider>
            <Toaster />
            <BrowserRouter>
              <Routes>
                  {/* Initial landing/routing page */}
                  <Route path="/index" element={<Index />} />

                  {/* Public patient portal */}
                  <Route path="/portal" element={<PatientPortal />} />

                  {/* Patient requests page */}

                  {/* Patient appointment scheduling */}
                  <Route
                    path="/portal/appointment"
                    element={<AppointmentScheduling />}
                  />

                  {/* Staff login */}
                  <Route
                    path="/login"
                    element={
                      <StaffRoute>
                        <Login />
                      </StaffRoute>
                    }
                  />

                  {/* Account activation */}
                  <Route
                    path="/account/activate/:uid/:token"
                    element={
                      <PublicRoute>
                        <AccountActivation />
                      </PublicRoute>
                    }
                  />

                  {/* Forgot password */}
                  <Route
                    path="/forgot-password"
                    element={
                      <StaffRoute>
                        <ForgotPassword />
                      </StaffRoute>
                    }
                  />

                  {/* Reset password (OTP-based) */}
                  <Route
                    path="/reset-password"
                    element={
                      <PublicRoute>
                        <ResetPassword />
                      </PublicRoute>
                    }
                  />

                  {/* Reset password (Email link-based) */}
                  <Route
                    path="/reset-password/:uidb64/:token"
                    element={
                      <PublicRoute>
                        <ResetPassword />
                      </PublicRoute>
                    }
                  />

                  {/* Change password for first-time users */}
                  <Route
                    path="/change-password"
                    element={
                      <PasswordChangeRoute>
                        <ChangePassword />
                      </PasswordChangeRoute>
                    }
                  />

                  {/* Default route redirects to portal */}
                  <Route
                    path="/"
                    element={<Navigate to="/portal" replace />}
                  />

                  {/* Patient management routes */}
                  <Route
                    path="/patients"
                    element={
                      <ProtectedRoute>
                        <AppLayout>
                          <PatientsList />
                        </AppLayout>
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/patients/add"
                    element={
                      <ProtectedRoute>
                        <AppLayout>
                          <AddPatient />
                        </AppLayout>
                      </ProtectedRoute>
                    }
                  />

                  <Route
                    path="/patients/:id"
                    element={
                      <ProtectedRoute>
                        <AppLayout>
                          <PatientManagement />
                        </AppLayout>
                      </ProtectedRoute>
                    }
                  />

                  {/* Appointments route */}
                  <Route
                    path="/appointments"
                    element={
                      <ProtectedRoute>
                        <AppLayout>
                          <Appointments />
                        </AppLayout>
                      </ProtectedRoute>
                    }
                  />

                  {/* Doctor schedule route */}
                  <Route
                    path="/schedule"
                    element={
                      <ProtectedRoute>
                        <AppLayout>
                          <Schedule />
                        </AppLayout>
                      </ProtectedRoute>
                    }
                  />

                  {/* Receptionist scheduler route */}
                  <Route
                    path="/receptionist-scheduler"
                    element={
                      <ProtectedRoute>
                        <AppLayout>
                          <ReceptionistScheduler />
                        </AppLayout>
                      </ProtectedRoute>
                    }
                  />

                  {/* Prescriptions route */}
                  <Route
                    path="/prescriptions"
                    element={
                      <ProtectedRoute>
                        <AppLayout>
                          <Prescriptions />
                        </AppLayout>
                      </ProtectedRoute>
                    }
                  />

                  {/* Medical Certificate Management route */}
                  <Route
                    path="/medical-certificates"
                    element={
                      <ProtectedRoute>
                        <AppLayout>
                          <MedicalCertificateManagement />
                        </AppLayout>
                      </ProtectedRoute>
                    }
                  />

                  {/* Medical Certificate Generation route */}
                  <Route
                    path="/patients/certificate-generate"
                    element={
                      <ProtectedRoute>
                        <AppLayout>
                          <MedicalCertificateGeneration />
                        </AppLayout>
                      </ProtectedRoute>
                    }
                  />

                  {/* Prescription Management route */}
                  <Route
                    path="/prescription-management"
                    element={
                      <ProtectedRoute>
                        <AppLayout>
                          <PrescriptionManagement />
                        </AppLayout>
                      </ProtectedRoute>
                    }
                  />

                  {/* Staff management route for admin */}
                  <Route
                    path="/staff"
                    element={
                      <ProtectedRoute>
                        <AppLayout>
                          <Staff />
                        </AppLayout>
                      </ProtectedRoute>
                    }
                  />

                  {/* Superadmin routes with permission checks */}
                  <Route
                    path="/permissions"
                    element={
                      <ProtectedRoute>
                        <AppLayout>
                          <PermissionGuard permission="can_manage_permissions">
                            <PermissionManagement />
                          </PermissionGuard>
                        </AppLayout>
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="/audit-logs"
                    element={
                      <ProtectedRoute>
                        <AppLayout>
                          <PermissionGuard permission="can_view_audit_logs">
                            <AuditLogs />
                          </PermissionGuard>
                        </AppLayout>
                      </ProtectedRoute>
                    }
                  />

                  {/* Settings route for admin */}
                  <Route
                    path="/settings"
                    element={
                      <ProtectedRoute>
                        <AppLayout>
                          <Settings />
                        </AppLayout>
                      </ProtectedRoute>
                    }
                  />

                  {/* User Settings route for staff members */}
                  <Route
                    path="/user-settings"
                    element={
                      <ProtectedRoute>
                        <AppLayout>
                          <UserSettings />
                        </AppLayout>
                      </ProtectedRoute>
                    }
                  />

                  {/* Lab Results route */}
                  <Route
                    path="/lab-results"
                    element={
                      <ProtectedRoute>
                        <AppLayout>
                          <LabResults />
                        </AppLayout>
                      </ProtectedRoute>
                    }
                  />

                  {/* Inventory route */}
                  <Route
                    path="/inventory"
                    element={
                      <ProtectedRoute>
                        <AppLayout>
                          <PermissionGuard permission="can_manage_inventory">
                            <Inventory />
                          </PermissionGuard>
                        </AppLayout>
                      </ProtectedRoute>
                    }
                  />

                  {/* Document Comparison route */}
                  <Route
                    path="/document-comparison"
                    element={
                      <ProtectedRoute>
                        <AppLayout>
                          <DocumentComparison />
                        </AppLayout>
                      </ProtectedRoute>
                    }
                  />
                  {/* 404 route */}
                  <Route path="*" element={<NotFound />} />
                </Routes>
              </BrowserRouter>
            </ClinicProvider>
          </BrandingProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};

export default App;
