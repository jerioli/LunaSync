import { useClinic } from "@/contexts/ClinicContext";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const navigate = useNavigate();
  const { currentUser } = useClinic();

  useEffect(() => {
    console.log("[Index] currentUser:", currentUser);
    // Small delay to ensure context is properly initialized
    const timer = setTimeout(() => {
      if (currentUser) {
        console.log("[Index] Redirecting authenticated user to /dashboard");
        navigate("/dashboard");
      } else {
        console.log("[Index] Redirecting unauthenticated user to /");
        navigate("/");
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [currentUser, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-clinic-gray">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">Loading HealthNexus...</h1>
        <p className="text-xl text-gray-600">
          Please wait while we load your clinic management system.
        </p>
      </div>
    </div>
  );
};

export default Index;
