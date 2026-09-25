import { BrowserRouter, Routes, Route } from "react-router-dom";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import BookAppointment from "./pages/BookAppointment";
import Appointments from "./pages/Appointments";
import Queue from "./pages/Queue";
import Waitlist from "./pages/Waitlist";
import StaffQueue from "./pages/StaffQueue";
import AdminDashboard from "./pages/AdminDashboard";
 

function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* Login */}
        <Route path="/" element={<Login />} />

        <Route path="/register" element={<Register />} />

        {/* Customer Dashboard */}
        <Route
          path="/dashboard"
          element={<Dashboard />}
        />

        {/* Customer */}
        <Route
          path="/book"
          element={<BookAppointment />}
        />

        <Route
          path="/appointments"
          element={<Appointments />}
        />

        <Route
          path="/queue"
          element={<Queue />}
        />

        <Route
          path="/waitlist"
          element={<Waitlist />}
        />

        {/* Staff */}
        <Route
          path="/staff"
          element={<StaffQueue />}
        />

        <Route
  path="/admin"
  element={<AdminDashboard />}
/>

      </Routes>
    </BrowserRouter>
  );
}

export default App;