
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { RegisterForm } from "@/components/auth/RegisterForm";
import { useAuth } from "@/contexts/AuthContext";

export default function Register() {
  const { currentUser, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && currentUser) {
      navigate("/dashboard");
    }
  }, [currentUser, isLoading, navigate]);

  const handleRegisterSuccess = (redirectTo?: string) => {
    navigate(redirectTo || "/dashboard");
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gradient-to-br from-background to-muted">
      <div className="w-full max-w-md">
        <RegisterForm onRegisterSuccess={handleRegisterSuccess} />
      </div>
    </div>
  );
}
