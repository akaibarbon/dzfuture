import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";

const Index = () => {
  const { user } = useAuth();
  return <Navigate to={user ? "/hub" : "/auth"} replace />;
};

export default Index;
