import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import TopLoader from "../components/TopLoader";

export default function ProtectedRoute({
  children,
}: {
 children: React.ReactNode;
}) {
  const { isAuth } = useAuth();

  
if (isAuth === null) {
  return <TopLoader />;
}

  if (!isAuth) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
