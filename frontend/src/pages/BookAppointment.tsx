import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import api from "../services/api";
import "./BookAppointment.css";

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
  price: string | number;
  duration: number;
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

  const [reschedulingId, setReschedulingId] =
    useState<number | null>(null);

  const [rescheduleDate, setRescheduleDate] =
    useState("");

  const [rescheduleSlot, setRescheduleSlot] =
    useState<string | null>(null);

  const [rescheduleSlots, setRescheduleSlots] =
    useState<string[]>([]);

  const [loadingRescheduleSlots, setLoadingRescheduleSlots] =
    useState(false);

  const [rescheduling, setRescheduling] =
    useState(false);

  const [appointments, setAppointments] =
    useState<Appointment[]>([]);

  const [appointmentsLoading, setAppointmentsLoading] =
    useState(false);

  const [reservation, setReservation] =
    useState<Reservation | null>(null);

  const [message, setMessage] = useState("");

  const [loadingBranches, setLoadingBranches] =
    useState(true);

  const [loadingServices, setLoadingServices] =
    useState(false);

  const [loadingSlots, setLoadingSlots] =
    useState(false);

  const [reserving, setReserving] =
    useState(false);

  const [booking, setBooking] =
    useState(false);

  useEffect(() => {
    async function loadBranches() {
      try {
        setLoadingBranches(true);

        const response = await api.get("/branches");

        setBranches(
          response.data.data ||
            response.data.branches ||
            []
        );
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
        setSelectedSlot(null);
        setReservation(null);

        const response = await api.get(
          `/services?branchId=${branchId}`
        );

        setServices(
          response.data.data ||
            response.data.services ||
            []
        );
      } catch (error) {
        console.error(error);
        setMessage("Could not load services.");
      } finally {
        setLoadingServices(false);
      }
    }

    loadServices();
  }, [branchId]);

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
      setSelectedSlot(null);
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

      const availableSlots =
        response.data.data.slots || [];

      setSlots(availableSlots);

      if (availableSlots.length === 0) {
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
        setMessage(
          "Could not check availability."
        );
      }
    } finally {
      setLoadingSlots(false);
    }
  }

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
        setMessage(
          "Could not reserve this slot."
        );
      }
    } finally {
      setReserving(false);
    }
  }

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
          reservationToken:
            reservation?.reservationToken,
        },
        {
          headers: {
            "Idempotency-Key":
              window.crypto.randomUUID(),
          },
        }
      );

      setMessage(
        `Appointment booked successfully! Appointment number: ${response.data.data.appointmentNumber}`
      );

      setSelectedSlot(null);
      setReservation(null);

      await loadAppointments();
    } catch (error: any) {
      console.error(error);

      setMessage(
        error.response?.data?.error?.message ||
          error.response?.data?.message ||
          "Booking failed. Please try again."
      );
    } finally {
      setBooking(false);
    }
  }

  async function loadAppointments() {
    try {
      setAppointmentsLoading(true);

      const response = await api.get(
        "/appointments/mine"
      );

      setAppointments(
        response.data.data || []
      );
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

      await api.patch(
        `/appointments/${id}/cancel`
      );

      setMessage(
        "Appointment cancelled successfully."
      );

      await loadAppointments();
    } catch (error: any) {
      console.error(error);

      setMessage(
        error.response?.data?.message ||
          "Unable to cancel appointment."
      );
    }
  }

  async function checkRescheduleAvailability() {
    if (
      !reschedulingId ||
      !branchId ||
      !serviceId ||
      !rescheduleDate
    ) {
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

      const availableSlots =
        response.data.data.slots || [];

      setRescheduleSlots(availableSlots);

      if (availableSlots.length === 0) {
        setMessage(
          "No slots available for this date."
        );
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

  const today = new Date()
    .toISOString()
    .split("T")[0];

  return (
    <div className="booking-page">

      {/* HEADER */}

      <header className="booking-header">
        <div>
          <h1>Smart Appointment & Queue</h1>
          <p>Book and manage your appointments</p>
        </div>

        <button
          className="back-button"
          onClick={() =>
            navigate("/dashboard")
          }
        >
          ← Dashboard
        </button>
      </header>

      <main className="booking-container">

        {/* BOOKING CARD */}

        <section className="booking-card">

          <div className="booking-title">
            <h2>Book an Appointment</h2>
            <p>
              Select a branch, service, date and available
              time slot.
            </p>
          </div>

          {/* SELECTION */}

          <div className="booking-form">

            <div className="booking-field">
              <label htmlFor="branch">
                Branch
              </label>

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
                  .filter(
                    (branch) => branch.active
                  )
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

            <div className="booking-field">
              <label htmlFor="service">
                Service
              </label>

              <select
                id="service"
                value={serviceId}
                onChange={(event) => {
                  setServiceId(
                    event.target.value
                  );
                  setSlots([]);
                  setSelectedSlot(null);
                  setReservation(null);
                }}
                disabled={
                  !branchId ||
                  loadingServices
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
                    {service.name} -{" "}
                    {service.duration} min
                  </option>
                ))}
              </select>
            </div>

            <div className="booking-field">
              <label htmlFor="date">
                Date
              </label>

              <input
                id="date"
                type="date"
                value={date}
                min={today}
                onChange={(event) => {
                  setDate(event.target.value);
                  setSlots([]);
                  setSelectedSlot(null);
                  setReservation(null);
                }}
              />
            </div>

          </div>

          <button
            className="availability-button"
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

        </section>

        {/* MESSAGE */}

        {message && (
          <div
            className="booking-message"
            role="status"
          >
            {message}
          </div>
        )}

        {/* AVAILABLE SLOTS */}

        {slots.length > 0 && (
          <section className="booking-card">

            <div className="booking-title">
              <h2>Available Slots</h2>
              <p>
                Select a time that works for you.
              </p>
            </div>

            <div className="slot-grid">
              {slots.map((slot) => (
                <button
                  key={slot}
                  type="button"
                  className={
                    selectedSlot === slot
                      ? "slot-button selected"
                      : "slot-button"
                  }
                  onClick={() => {
                    setSelectedSlot(slot);
                    setReservation(null);
                    setMessage("");
                  }}
                >
                  {slot}
                </button>
              ))}
            </div>

            {selectedSlot && (
              <div className="selected-slot">
                Selected time:
                <strong>
                  {selectedSlot}
                </strong>
              </div>
            )}

          </section>
        )}

        {/* RESERVATION */}

        {selectedSlot && !reservation && (
          <section className="reservation-card">

            <div>
              <h3>Reserve this slot</h3>
              <p>
                Reserve the selected slot temporarily
                before confirming your appointment.
              </p>
            </div>

            <button
              type="button"
              onClick={reserveSlot}
              disabled={reserving}
              className="reserve-button"
            >
              {reserving
                ? "Reserving..."
                : "Reserve Slot"}
            </button>

          </section>
        )}

        {/* CONFIRM */}

        {reservation && (
          <section className="confirmation-card">

            <div className="confirmation-content">
              <div>
                <h2>Slot Reserved</h2>

                <p>
                  Your slot is temporarily reserved.
                  Please confirm your appointment before
                  the reservation expires.
                </p>

                <p>
                  Reservation expires at:
                  <strong>
                    {" "}
                    {new Date(
                      reservation.expiresAt
                    ).toLocaleTimeString()}
                  </strong>
                </p>
              </div>

              <button
                type="button"
                onClick={confirmBooking}
                disabled={booking}
                className="confirm-button"
              >
                {booking
                  ? "Booking..."
                  : "Confirm Appointment"}
              </button>
            </div>

          </section>
        )}

        {/* MY APPOINTMENTS */}

        <section className="appointments-section">

          <div className="booking-title">
            <h2>My Appointments</h2>
            <p>
              View, cancel or reschedule your appointments.
            </p>
          </div>

          {appointmentsLoading ? (
            <div className="appointment-empty">
              <p>Loading appointments...</p>
            </div>
          ) : appointments.length === 0 ? (
            <div className="appointment-empty">
              <p>No appointments found.</p>
            </div>
          ) : (
            <div className="appointment-list">

              {appointments.map(
                (appointment) => (
                  <div
                    key={appointment.id}
                    className="appointment-card"
                  >

                    <div className="appointment-header">

                      <div>
                        <h3>
                          Appointment #
                          {appointment.appointmentNumber}
                        </h3>

                        <span
                          className={`appointment-status status-${appointment.status.toLowerCase()}`}
                        >
                          {appointment.status.replace(
                            "_",
                            " "
                          )}
                        </span>
                      </div>

                    </div>

                    <div className="appointment-details">

                      <p>
                        <strong>Branch</strong>
                        <span>
                          {appointment.branch.name}
                        </span>
                      </p>

                      <p>
                        <strong>Service</strong>
                        <span>
                          {appointment.service.name}
                        </span>
                      </p>

                      <p>
                        <strong>Date</strong>
                        <span>
                          {appointment.appointmentDate.slice(
                            0,
                            10
                          )}
                        </span>
                      </p>

                      <p>
                        <strong>Time</strong>
                        <span>
                          {appointment.startTime.slice(
                            11,
                            16
                          )}
                          {" - "}
                          {appointment.endTime.slice(
                            11,
                            16
                          )}
                        </span>
                      </p>

                    </div>

                    {(appointment.status ===
                      "CONFIRMED" ||
                      appointment.status ===
                        "PENDING") && (
                      <div className="appointment-actions">

                        <button
                          className="cancel-appointment-button"
                          type="button"
                          onClick={() =>
                            cancelAppointment(
                              appointment.id
                            )
                          }
                        >
                          Cancel
                        </button>

                        <button
                          className="reschedule-button"
                          type="button"
                          onClick={() => {
                            setReschedulingId(
                              appointment.id
                            );

                            setBranchId(
                              String(
                                appointment.branchId ??
                                  branchId
                              )
                            );

                            setServiceId(
                              String(
                                appointment.serviceId ??
                                  serviceId
                              )
                            );

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
                )
              )}

            </div>
          )}

        </section>

        {/* RESCHEDULE */}

        {reschedulingId && (
          <section className="reschedule-card">

            <div className="booking-title">
              <h2>Reschedule Appointment</h2>
              <p>
                Select a new date and available time.
              </p>
            </div>

            <div className="booking-field">
              <label htmlFor="reschedule-date">
                New Date
              </label>

              <input
                id="reschedule-date"
                type="date"
                value={rescheduleDate}
                min={today}
                onChange={(event) => {
                  setRescheduleDate(
                    event.target.value
                  );
                  setRescheduleSlots([]);
                  setRescheduleSlot(null);
                }}
              />
            </div>

            <button
              type="button"
              onClick={
                checkRescheduleAvailability
              }
              disabled={
                !rescheduleDate ||
                loadingRescheduleSlots
              }
              className="availability-button"
            >
              {loadingRescheduleSlots
                ? "Checking..."
                : "Check New Slots"}
            </button>

            {rescheduleSlots.length > 0 && (
              <div className="reschedule-slots">

                <h3>Select New Time</h3>

                <div className="slot-grid">
                  {rescheduleSlots.map(
                    (slot) => (
                      <button
                        key={slot}
                        type="button"
                        className={
                          rescheduleSlot ===
                          slot
                            ? "slot-button selected"
                            : "slot-button"
                        }
                        onClick={() =>
                          setRescheduleSlot(
                            slot
                          )
                        }
                      >
                        {slot}
                      </button>
                    )
                  )}
                </div>

              </div>
            )}

            {rescheduleSlot && (
              <div className="selected-slot">
                New slot:
                <strong>
                  {rescheduleSlot}
                </strong>
              </div>
            )}

            <div className="reschedule-actions">

              <button
                type="button"
                onClick={
                  rescheduleAppointment
                }
                disabled={
                  !rescheduleSlot ||
                  rescheduling
                }
                className="confirm-button"
              >
                {rescheduling
                  ? "Rescheduling..."
                  : "Confirm Reschedule"}
              </button>

              <button
                type="button"
                className="secondary-button"
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

          </section>
        )}

      </main>
    </div>
  );
}