import { BrowserRouter, Routes, Route } from "react-router-dom";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import BookAppointment from "./pages/BookAppointment";
import Appointments from "./pages/Appointments";
import Queue from "./pages/Queue";
import Waitlist from "./pages/Waitlist";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />

        <Route
          path="/dashboard"
          element={<Dashboard />}
        />

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
      </Routes>
    </BrowserRouter>
  );
}

export default App;