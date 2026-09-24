import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import api from "../services/api";

type Branch = {
  id: number;
  name: string;
  address: string;
  contact?: string;
  active: boolean;
};

type Service = {
  id: number;
  branchId: number;
  name: string;
  description?: string;
  duration: number;
  price: string | number;
  capacity: number;
  active: boolean;
};

type Reservation = {
  reservationId: number;
  reservationToken: string;
  expiresAt: string;
  expiresInSeconds: number;
};

type Appointment = {
  id: number;
  appointmentNumber: string;
  userId: number;
  branchId: number;
  serviceId: number;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  status: string;
  notes?: string;
  branch: {
    name: string;
  };
  service: {
    name: string;
  };
};

export default function BookAppointment() {
  const navigate = useNavigate();

  const [branches, setBranches] = useState<Branch[]>([]);
  const [services, setServices] = useState<Service[]>([]);

  const [branchId, setBranchId] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [date, setDate] = useState("");

  const [slots, setSlots] = useState<string[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);

  const [reschedulingId, setReschedulingId] = useState<number | null>(null);
const [rescheduleDate, setRescheduleDate] = useState("");
const [rescheduleSlot, setRescheduleSlot] = useState<string | null>(null);
const [rescheduleSlots, setRescheduleSlots] = useState<string[]>([]);
const [loadingRescheduleSlots, setLoadingRescheduleSlots] = useState(false);
const [rescheduling, setRescheduling] = useState(false);

const [appointments, setAppointments] = useState<Appointment[]>([]);
const [appointmentsLoading, setAppointmentsLoading] = useState(false);

  const [reservation, setReservation] =
    useState<Reservation | null>(null);

  const [message, setMessage] = useState("");
  const [loadingBranches, setLoadingBranches] = useState(true);
  const [loadingServices, setLoadingServices] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [reserving, setReserving] = useState(false);
  const [booking, setBooking] = useState(false);

  // --------------------------------
  // LOAD BRANCHES
  // --------------------------------

  useEffect(() => {
    async function loadBranches() {
      try {
        setLoadingBranches(true);

        const response = await api.get("/branches");

        setBranches(response.data.data);
      } catch (error) {
        console.error(error);
        setMessage("Could not load branches.");
      } finally {
        setLoadingBranches(false);
      }
    }

    loadBranches();
  }, []);

  useEffect(() => {
  loadAppointments();
}, []);

  // --------------------------------
  // LOAD SERVICES WHEN BRANCH CHANGES
  // --------------------------------

  useEffect(() => {
    async function loadServices() {
      if (!branchId) {
        setServices([]);
        return;
      }

      try {
        setLoadingServices(true);
        setServices([]);
        setServiceId("");
        setSlots([]);
        setSelectedSlot("");
        setReservation(null);

        const response = await api.get(
          `/services?branchId=${branchId}`
        );

        setServices(response.data.data);
      } catch (error) {
        console.error(error);
        setMessage("Could not load services.");
      } finally {
        setLoadingServices(false);
      }
    }

    loadServices();
  }, [branchId]);

  // --------------------------------
  // CHECK AVAILABILITY
  // --------------------------------

  async function checkAvailability() {
    if (!branchId || !serviceId || !date) {
      setMessage(
        "Please select a branch, service and date."
      );
      return;
    }

    try {
      setLoadingSlots(true);
      setMessage("");
      setSlots([]);
      setSelectedSlot("");
      setReservation(null);

      const response = await api.get(
        "/appointments/availability",
        {
          params: {
            branchId,
            serviceId,
            date,
          },
        }
      );

      setSlots(response.data.data.slots || []);

      if (response.data.data.slots?.length === 0) {
        setMessage(
          response.data.data.message ||
            "No slots are available for this date."
        );
      } else {
        setMessage(
          "Select an available time slot."
        );
      }
    } catch (error) {
      console.error(error);

      if (axios.isAxiosError(error)) {
        setMessage(
          error.response?.data?.error?.message ||
            "Could not check availability."
        );
      } else {
        setMessage("Could not check availability.");
      }
    } finally {
      setLoadingSlots(false);
    }
  }


  async function checkRescheduleAvailability() {
  if (!reschedulingId || !branchId || !serviceId || !rescheduleDate) {
    setMessage("Please select a date.");
    return;
  }

  try {
    setLoadingRescheduleSlots(true);
    setMessage("");
    setRescheduleSlots([]);
    setRescheduleSlot(null);

    const response = await api.get(
      "/appointments/availability",
      {
        params: {
          branchId,
          serviceId,
          date: rescheduleDate,
        },
      }
    );

    setRescheduleSlots(
      response.data.data.slots || []
    );

    if (
      !response.data.data.slots ||
      response.data.data.slots.length === 0
    ) {
      setMessage("No slots available for this date.");
    }
  } catch (error: any) {
    console.error(error);

    setMessage(
      error.response?.data?.error?.message ||
        "Could not check reschedule availability."
    );
  } finally {
    setLoadingRescheduleSlots(false);
  }
}




async function rescheduleAppointment() {
  if (
    !reschedulingId ||
    !rescheduleDate ||
    !rescheduleSlot
  ) {
    setMessage(
      "Please select a date and time slot."
    );
    return;
  }

  try {
    setRescheduling(true);
    setMessage("");

    await api.patch(
      `/appointments/${reschedulingId}/reschedule`,
      {
        date: rescheduleDate,
        startTime: rescheduleSlot,
      }
    );

    setMessage(
      "Appointment rescheduled successfully."
    );

    setReschedulingId(null);
    setRescheduleDate("");
    setRescheduleSlot(null);
    setRescheduleSlots([]);

    await loadAppointments();
  } catch (error: any) {
    console.error(error);

    setMessage(
      error.response?.data?.error?.message ||
        error.response?.data?.message ||
        "Unable to reschedule appointment."
    );
  } finally {
    setRescheduling(false);
  }
}

  // --------------------------------
  // RESERVE SLOT
  // --------------------------------

  async function reserveSlot() {
    if (!selectedSlot) {
      setMessage("Please select a time slot.");
      return;
    }

    try {
      setReserving(true);
      setMessage("");

      const response = await api.post(
        "/reservations",
        {
          branchId: Number(branchId),
          serviceId: Number(serviceId),
          date,
          startTime: selectedSlot,
        }
      );

      setReservation(response.data.data);

      setMessage(
        "Slot reserved for 5 minutes. Confirm your appointment."
      );
    } catch (error) {
      console.error(error);

      if (axios.isAxiosError(error)) {
        setMessage(
          error.response?.data?.error?.message ||
            "Could not reserve this slot."
        );
      } else {
        setMessage("Could not reserve this slot.");
      }
    } finally {
      setReserving(false);
    }
  }

  async function loadAppointments() {
  try {
    setAppointmentsLoading(true);

    const response = await api.get("/appointments/mine");

    setAppointments(response.data.data);
  } catch (error: any) {
    console.error(error);

    setMessage(
      error.response?.data?.message ||
        "Unable to load appointments."
    );
  } finally {
    setAppointmentsLoading(false);
  }
}

async function cancelAppointment(id: number) {
  const confirmed = window.confirm(
    "Are you sure you want to cancel this appointment?"
  );

  if (!confirmed) {
    return;
  }

  try {
    setMessage("");

    await api.patch(`/appointments/${id}/cancel`);

    setMessage("Appointment cancelled successfully.");

    await loadAppointments();
  } catch (error: any) {
    console.error(error);

    setMessage(
      error.response?.data?.message ||
        "Unable to cancel appointment."
    );
  }
}
  // --------------------------------
  // CONFIRM APPOINTMENT
  // --------------------------------

  async function confirmBooking() {
  if (!selectedSlot) {
    setMessage("Please select a slot.");
    return;
  }

  try {
    setBooking(true);
    setMessage("");

    const response = await api.post(
      "/appointments",
      {
        branchId: Number(branchId),
        serviceId: Number(serviceId),
        date,
        startTime: selectedSlot,
        reservationToken: reservation?.reservationToken,
      },
      {
        headers: {
          "Idempotency-Key": window.crypto.randomUUID(),
        },
      }
    );

    setMessage(
      `Appointment booked successfully! Appointment number: ${response.data.data.appointmentNumber}`
    );

    // Clear selected slot/reservation after successful booking
    setSelectedSlot(null);
    setReservation(null);

    // Reload appointments if you have this function
     

  } catch (error: any) {
    console.error(error);

    setMessage(
      error.response?.data?.message ||
      "Booking failed. Please try again."
    );
  } finally {
    setBooking(false);
  }
}


  // --------------------------------
  // PAGE
  // --------------------------------

  return (
    <main>
      <h1>Book Appointment</h1>

      <button
        type="button"
        onClick={() => navigate("/dashboard")}
      >
        ← Back to Dashboard
      </button>

      <hr />

      {/* BRANCH */}

      <div>
        <label htmlFor="branch">
          Branch
        </label>

        <br />

        <select
          id="branch"
          value={branchId}
          onChange={(event) =>
            setBranchId(event.target.value)
          }
          disabled={loadingBranches}
        >
          <option value="">
            {loadingBranches
              ? "Loading branches..."
              : "Select a branch"}
          </option>

          {branches
            .filter((branch) => branch.active)
            .map((branch) => (
              <option
                key={branch.id}
                value={branch.id}
              >
                {branch.name}
              </option>
            ))}
        </select>
      </div>

      <br />

      {/* SERVICE */}

      <div>
        <label htmlFor="service">
          Service
        </label>

        <br />

        <select
          id="service"
          value={serviceId}
          onChange={(event) => {
            setServiceId(event.target.value);
            setSlots([]);
            setSelectedSlot("");
            setReservation(null);
          }}
          disabled={
            !branchId || loadingServices
          }
        >
          <option value="">
            {!branchId
              ? "Select branch first"
              : loadingServices
              ? "Loading services..."
              : "Select a service"}
          </option>

          {services.map((service) => (
            <option
              key={service.id}
              value={service.id}
            >
              {service.name} - {service.duration} min
            </option>
          ))}
        </select>
      </div>

      <br />

      {/* DATE */}

      <div>
        <label htmlFor="date">
          Date
        </label>

        <br />

        <input
          id="date"
          type="date"
          value={date}
          min={
            new Date()
              .toISOString()
              .split("T")[0]
          }
          onChange={(event) => {
            setDate(event.target.value);
            setSlots([]);
            setSelectedSlot("");
            setReservation(null);
          }}
        />
      </div>

      <br />

      {/* AVAILABILITY */}

      <button
        type="button"
        onClick={checkAvailability}
        disabled={
          !branchId ||
          !serviceId ||
          !date ||
          loadingSlots
        }
      >
        {loadingSlots
          ? "Checking..."
          : "Check Availability"}
      </button>

      <hr />

      {/* SLOTS */}

      {slots.length > 0 && (
        <section>
          <h2>Available Slots</h2>

          <div>
            {slots.map((slot) => (
              <button
                key={slot}
                type="button"
                onClick={() => {
                  setSelectedSlot(slot);
                  setReservation(null);
                  setMessage("");
                }}
                style={{
                  margin: "5px",
                  fontWeight:
                    selectedSlot === slot
                      ? "bold"
                      : "normal",
                }}
              >
                {slot}
              </button>
            ))}
          </div>

          {selectedSlot && (
            <p>
              Selected slot:{" "}
              <strong>
                {selectedSlot}
              </strong>
            </p>
          )}
        </section>
      )}

      {/* RESERVATION */}

      {selectedSlot && !reservation && (
        <div>
          <button
            type="button"
            onClick={reserveSlot}
            disabled={reserving}
          >
            {reserving
              ? "Reserving..."
              : "Reserve Slot"}
          </button>
        </div>
      )}

      {/* CONFIRM */}

      {reservation && (
        <section>
          <h2>Slot Reserved</h2>

          <p>
            Your slot is temporarily reserved.
          </p>

          <p>
            Reservation expires at:{" "}
            <strong>
              {new Date(
                reservation.expiresAt
              ).toLocaleTimeString()}
            </strong>
          </p>

          <button
            type="button"
            onClick={confirmBooking}
            disabled={booking}
          >
            {booking
              ? "Booking..."
              : "Confirm Appointment"}
          </button>
        </section>
      )}

      {/* MESSAGE */}

      {message && (
        <p role="status">
          {message}
        </p>
      )}

      <section className="appointments-section">
  <h2>My Appointments</h2>

  {appointmentsLoading ? (
    <p>Loading appointments...</p>
  ) : appointments.length === 0 ? (
    <p>No appointments found.</p>
  ) : (
    <div>
      {appointments.map((appointment) => (
        <div
          key={appointment.id}
          className="appointment-card"
        >
          <h3>
            Appointment #{appointment.appointmentNumber}
          </h3>

          <p>
            <strong>Branch:</strong>{" "}
            {appointment.branch.name}
          </p>

          <p>
            <strong>Service:</strong>{" "}
            {appointment.service.name}
          </p>

          <p>
            <strong>Date:</strong>{" "}
            {appointment.appointmentDate.slice(0, 10)}
          </p>

          <p>
            <strong>Time:</strong>{" "}
            {appointment.startTime.slice(11, 16)}
            {" - "}
            {appointment.endTime.slice(11, 16)}
          </p>

          <p>
            <strong>Status:</strong>{" "}
            {appointment.status}
          </p>

          {(appointment.status === "CONFIRMED" ||
  appointment.status === "PENDING") && (
  <div>
    <button
      type="button"
      onClick={() =>
        cancelAppointment(appointment.id)
      }
    >
      Cancel Appointment
    </button>

    <button
      type="button"
      onClick={() => {
        setReschedulingId(appointment.id);
        setBranchId(String(
          appointment.branchId ?? branchId
        ));
        setServiceId(String(
          appointment.serviceId ?? serviceId
        ));
        setRescheduleDate("");
        setRescheduleSlot(null);
        setRescheduleSlots([]);
        setMessage("");
      }}
    >
      Reschedule
    </button>
  </div>
)}
        </div>
      ))}
    </div>
  )}
</section>
{reschedulingId && (
  <div>
    <hr />

    <h3>Reschedule Appointment</h3>

    <label htmlFor="reschedule-date">
      New Date
    </label>

    <br />

    <input
      id="reschedule-date"
      type="date"
      value={rescheduleDate}
      min={
        new Date()
          .toISOString()
          .split("T")[0]
      }
      onChange={(event) => {
        setRescheduleDate(event.target.value);
        setRescheduleSlots([]);
        setRescheduleSlot(null);
      }}
    />

    <br />
    <br />

    <button
      type="button"
      onClick={checkRescheduleAvailability}
      disabled={
        !rescheduleDate ||
        loadingRescheduleSlots
      }
    >
      {loadingRescheduleSlots
        ? "Checking..."
        : "Check New Slots"}
    </button>

    {rescheduleSlots.length > 0 && (
      <div>
        <h4>Select New Time</h4>

        {rescheduleSlots.map((slot) => (
          <button
            key={slot}
            type="button"
            onClick={() =>
              setRescheduleSlot(slot)
            }
            style={{
              margin: "5px",
              fontWeight:
                rescheduleSlot === slot
                  ? "bold"
                  : "normal",
            }}
          >
            {slot}
          </button>
        ))}
      </div>
    )}

    {rescheduleSlot && (
      <p>
        New slot:{" "}
        <strong>{rescheduleSlot}</strong>
      </p>
    )}

    <button
      type="button"
      onClick={rescheduleAppointment}
      disabled={
        !rescheduleSlot || rescheduling
      }
    >
      {rescheduling
        ? "Rescheduling..."
        : "Confirm Reschedule"}
    </button>

    <button
      type="button"
      onClick={() => {
        setReschedulingId(null);
        setRescheduleDate("");
        setRescheduleSlot(null);
        setRescheduleSlots([]);
      }}
    >
      Cancel
    </button>
  </div>
)}
    </main>
  );
}

