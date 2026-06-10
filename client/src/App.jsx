import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AdminLogin from "./pages/auth/LoginPage";
import Homepage from "./pages/home/Homepage";
import ProtectedRoute from "./components/ProtectedRoutes";

function App() {
  return(
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to ="/login" replace />} />
        <Route path="/login" element={<AdminLogin />} />
        <Route path="/home" element={
          <ProtectedRoute>
            <Homepage />
          </ProtectedRoute>
        } />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
