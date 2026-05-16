import { BrowserRouter, Routes, Route } from "react-router-dom";
import AdminLogin from "./pages/LoginPage";

function App() {
  return(
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AdminLogin />} />
        <Route path="/login" element={<AdminLogin />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
