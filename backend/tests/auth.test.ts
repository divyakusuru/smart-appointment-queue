import request from "supertest";
import app from "../src/app";

describe("Smart Appointment API", () => {
  test("GET /api/health should return 200", async () => {
    const response = await request(app)
      .get("/api/health");

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  test("POST /api/auth/login should reject invalid credentials", async () => {
    const response = await request(app)
      .post("/api/auth/login")
      .send({
        email: "invalid-user@example.com",
        password: "wrongpassword",
      });

    expect([400, 401]).toContain(response.status);
    expect(response.body.success).toBe(false);
  });

  test("GET /api/queue/mine should reject unauthenticated users", async () => {
    const response = await request(app)
      .get("/api/queue/mine")
      .query({
        branchId: 3,
        date: new Date().toISOString().split("T")[0],
      });

    expect([401, 403]).toContain(response.status);
  });

  test("GET /api/notifications should reject unauthenticated users", async () => {
    const response = await request(app)
      .get("/api/notifications");

    expect([401, 403]).toContain(response.status);
  });
});