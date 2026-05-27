import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/authContext";

export default function ProtectedRoute({ children }){
  const { userLoggedIn } = useAuth();
  if(userLoggedIn){
    return children;
  }
  return <Navigate to="/login" replace />;
}