import { OpenAPIV3 } from "openapi-types";

export const swaggerSpec: OpenAPIV3.Document = {
  openapi: "3.0.0",

  info: {
    title: "Smart Appointment & Queue Management API",
    version: "1.0.0",
    description:
      "REST API for the Smart Appointment & Queue Management System",
  },

  servers: [
    {
      url: "http://localhost:5000",
      description: "Local development server",
    },
  ],

  tags: [
    {
      name: "Authentication",
      description: "User authentication APIs",
    },
    {
      name: "Branches",
      description: "Branch management APIs",
    },
    {
      name: "Services",
      description: "Service management APIs",
    },
    {
      name: "Appointments",
      description: "Appointment booking and management APIs",
    },
    {
      name: "Reservations",
      description: "Temporary appointment reservations",
    },
    {
      name: "Waitlist",
      description: "Customer waitlist APIs",
    },
    {
      name: "Queue",
      description: "Staff queue management APIs",
    },
    {
      name: "Notifications",
      description: "Customer notification APIs",
    },
  ],

  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
      },
    },
  },

  paths: {
    "/api/auth/register": {
      post: {
        tags: ["Authentication"],
        summary: "Register a new customer",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name", "email", "password"],
                properties: {
                  name: {
                    type: "string",
                    example: "John Doe",
                  },
                  email: {
                    type: "string",
                    example: "john@example.com",
                  },
                  password: {
                    type: "string",
                    example: "Password@123",
                  },
                },
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Customer registered successfully",
          },
          "400": {
            description: "Invalid request",
          },
        },
      },
    },

    "/api/auth/login": {
      post: {
        tags: ["Authentication"],
        summary: "Login",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password"],
                properties: {
                  email: {
                    type: "string",
                    example: "john@example.com",
                  },
                  password: {
                    type: "string",
                    example: "Password@123",
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Login successful",
          },
          "401": {
            description: "Invalid credentials",
          },
        },
      },
    },

    "/api/auth/refresh": {
      post: {
        tags: ["Authentication"],
        summary: "Refresh access token",
        responses: {
          "200": {
            description: "New access token generated",
          },
        },
      },
    },

    "/api/auth/logout": {
      post: {
        tags: ["Authentication"],
        summary: "Logout",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "Logged out successfully",
          },
        },
      },
    },

    "/api/auth/me": {
      get: {
        tags: ["Authentication"],
        summary: "Get current user",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "Current user",
          },
          "401": {
            description: "Unauthorized",
          },
        },
      },
    },

    "/api/branches": {
      get: {
        tags: ["Branches"],
        summary: "Get all branches",
        responses: {
          "200": {
            description: "List of branches",
          },
        },
      },
    },

    "/api/services": {
      get: {
        tags: ["Services"],
        summary: "Get services",
        parameters: [
          {
            name: "branchId",
            in: "query",
            required: false,
            schema: {
              type: "integer",
            },
          },
        ],
        responses: {
          "200": {
            description: "List of services",
          },
        },
      },
    },

    "/api/services/{id}/resources": {
      get: {
        tags: ["Services"],
        summary: "Get resources assigned to a service",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: {
              type: "integer",
            },
          },
        ],
        responses: {
          "200": {
            description: "Assigned resources",
          },
        },
      },

      put: {
        tags: ["Services"],
        summary: "Assign resources to a service",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: {
              type: "integer",
            },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  resourceIds: {
                    type: "array",
                    items: {
                      type: "integer",
                    },
                    example: [1, 2],
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Resources assigned successfully",
          },
        },
      },
    },

    "/api/appointments/availability": {
      get: {
        tags: ["Appointments"],
        summary: "Check appointment availability",
        parameters: [
          {
            name: "branchId",
            in: "query",
            required: true,
            schema: {
              type: "integer",
            },
          },
          {
            name: "serviceId",
            in: "query",
            required: true,
            schema: {
              type: "integer",
            },
          },
          {
            name: "date",
            in: "query",
            required: true,
            schema: {
              type: "string",
              format: "date",
            },
          },
        ],
        responses: {
          "200": {
            description: "Available appointment slots",
          },
        },
      },
    },

    "/api/appointments": {
      post: {
        tags: ["Appointments"],
        summary: "Book an appointment",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "Idempotency-Key",
            in: "header",
            required: true,
            schema: {
              type: "string",
            },
            example: "booking-12345",
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  branchId: {
                    type: "integer",
                    example: 3,
                  },
                  serviceId: {
                    type: "integer",
                    example: 1,
                  },
                  date: {
                    type: "string",
                    format: "date",
                    example: "2026-10-01",
                  },
                  startTime: {
                    type: "string",
                    example: "10:00",
                  },
                  notes: {
                    type: "string",
                    example: "Regular appointment",
                  },
                },
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Appointment created",
          },
          "409": {
            description: "Slot unavailable or idempotency conflict",
          },
        },
      },
    },

    "/api/appointments/mine": {
      get: {
        tags: ["Appointments"],
        summary: "Get my appointments",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "Customer appointments",
          },
        },
      },
    },

    "/api/appointments/{id}/cancel": {
      patch: {
        tags: ["Appointments"],
        summary: "Cancel appointment",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: {
              type: "integer",
            },
          },
        ],
        responses: {
          "200": {
            description: "Appointment cancelled",
          },
        },
      },
    },

    "/api/appointments/{id}/reschedule": {
      patch: {
        tags: ["Appointments"],
        summary: "Reschedule appointment",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: {
              type: "integer",
            },
          },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["date", "startTime"],
                properties: {
                  date: {
                    type: "string",
                    format: "date",
                    example: "2026-10-02",
                  },
                  startTime: {
                    type: "string",
                    example: "11:00",
                  },
                },
              },
            },
          },
        },
        responses: {
          "200": {
            description: "Appointment rescheduled",
          },
        },
      },
    },

    "/api/reservations": {
      post: {
        tags: ["Reservations"],
        summary: "Create temporary reservation",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: [
                  "branchId",
                  "serviceId",
                  "date",
                  "startTime",
                ],
                properties: {
                  branchId: {
                    type: "integer",
                    example: 3,
                  },
                  serviceId: {
                    type: "integer",
                    example: 1,
                  },
                  date: {
                    type: "string",
                    format: "date",
                    example: "2026-10-01",
                  },
                  startTime: {
                    type: "string",
                    example: "10:00",
                  },
                },
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Reservation created",
          },
          "409": {
            description: "Slot unavailable",
          },
        },
      },
    },

    "/api/waitlist": {
      post: {
        tags: ["Waitlist"],
        summary: "Join waitlist",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: [
                  "branchId",
                  "serviceId",
                  "requestedDate",
                ],
                properties: {
                  branchId: {
                    type: "integer",
                    example: 3,
                  },
                  serviceId: {
                    type: "integer",
                    example: 1,
                  },
                  requestedDate: {
                    type: "string",
                    format: "date",
                    example: "2026-10-01",
                  },
                  requestedTime: {
                    type: "string",
                    example: "10:00",
                  },
                },
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Added to waitlist",
          },
          "409": {
            description: "Already on waitlist",
          },
        },
      },
    },

    "/api/waitlist/my": {
      get: {
        tags: ["Waitlist"],
        summary: "Get my waitlist entries",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "Customer waitlist entries",
          },
        },
      },
    },

    "/api/waitlist/{id}": {
      delete: {
        tags: ["Waitlist"],
        summary: "Leave waitlist",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: {
              type: "integer",
            },
          },
        ],
        responses: {
          "200": {
            description: "Removed from waitlist",
          },
        },
      },
    },

    "/api/queue/mine": {
      get: {
        tags: ["Queue"],
        summary: "Get my queue position",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "branchId",
            in: "query",
            required: true,
            schema: {
              type: "integer",
            },
          },
          {
            name: "date",
            in: "query",
            required: true,
            schema: {
              type: "string",
              format: "date",
            },
          },
        ],
        responses: {
          "200": {
            description: "Customer queue information",
          },
        },
      },
    },

    "/api/queue/walkin": {
      post: {
        tags: ["Queue"],
        summary: "Add walk-in customer",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  name: {
                    type: "string",
                    example: "Walk-in Customer",
                  },
                  phone: {
                    type: "string",
                    example: "9876543210",
                  },
                  branchId: {
                    type: "integer",
                    example: 3,
                  },
                  serviceId: {
                    type: "integer",
                    example: 1,
                  },
                  priority: {
                    type: "string",
                    enum: [
                      "NORMAL",
                      "PRIORITY",
                      "EMERGENCY",
                    ],
                  },
                },
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Walk-in added to queue",
          },
        },
      },
    },

    "/api/notifications": {
      get: {
        tags: ["Notifications"],
        summary: "Get my notifications",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "Notifications",
          },
        },
      },
    },

    "/api/notifications/read-all": {
      patch: {
        tags: ["Notifications"],
        summary: "Mark all notifications as read",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "Notifications marked as read",
          },
        },
      },
    },

    "/api/notifications/{id}/read": {
      patch: {
        tags: ["Notifications"],
        summary: "Mark notification as read",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "id",
            in: "path",
            required: true,
            schema: {
              type: "integer",
            },
          },
        ],
        responses: {
          "200": {
            description: "Notification marked as read",
          },
        },
      },
    },
  },
};