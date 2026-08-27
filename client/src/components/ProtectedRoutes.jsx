import { Navigate } from "react-router-dom";
import { useAuth } from "../contexts/authContext";

export default function ProtectedRoute({ children }) {
  const { userLoggedIn, userRole, accountSwitching } = useAuth();

  // While an admin is mid-flow creating a teacher/admin account, Firebase
  // Auth briefly switches to the new user before their Firestore role doc
  // exists. Don't bounce to /login during that window.
  if (accountSwitching) {
    return children;
  }

  if (userLoggedIn && userRole) {
    return children;
  }

  return <Navigate to="/login" replace />;
}