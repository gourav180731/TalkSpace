import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import TopLoader from "../components/TopLoader";

export default function PublicRoute({
  children,
}: {
  children: React.ReactNode;

}) {
    const { isAuth } = useAuth();
    
if (isAuth === null) {
  return <TopLoader />;
  }

  if (isAuth) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
