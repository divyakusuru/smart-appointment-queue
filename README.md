# Smart Appointment & Queue Management System

A full-stack appointment and queue management system for multiple branches.

## Features

### Customer
- Register and login
- View branches and services
- Check appointment availability
- Reserve appointment slots
- Book appointments
- Cancel appointments
- Reschedule appointments
- View appointment history
- Join waitlist
- View waitlist position
- Leave waitlist
- View queue status
- View notifications
- Mark notifications as read

### Staff
- View branch queue
- Add walk-in customers
- Assign queue priority
- Call next customer
- Start service
- Complete service
- Skip customer
- Cancel queue entry

### Admin
- Manage service resources
- Assign resources to services
- Manage branch/service configuration
- View administrative dashboard

## Security

- JWT authentication
- Refresh tokens
- Password hashing using bcrypt
- Role-based access control
- IDOR protection
- Server-side validation
- Rate limiting
- CORS protection
- Idempotency-Key support for booking
- PostgreSQL transaction handling
- PostgreSQL advisory locks for concurrent operations

## Queue Management

Queue priorities:

- NORMAL
- PRIORITY
- EMERGENCY

Customers can be:

- Waiting
- Called
- In Progress
- Completed
- Skipped
- Cancelled
- No Show

## Waitlist

Customers can join a waitlist when a preferred appointment slot is unavailable.

The system tracks:

- Branch
- Service
- Requested date
- Preferred time
- Waitlist status
- Queue position

Eligible waitlist customers can be processed when appointments become available.

## Notifications

The system generates notifications for important appointment events such as:

- Appointment confirmation
- Cancellation
- Rescheduling
- Waitlist updates
- Queue updates

Customers can view and mark notifications as read.

## Technology Stack

### Frontend
- React
- TypeScript
- Vite
- React Router
- Axios
- CSS

### Backend
- Node.js
- Express
- TypeScript
- Prisma
- JWT
- Zod
- bcryptjs

### Database
- PostgreSQL

### Caching and Jobs
- Redis
- BullMQ

### Infrastructure
- Docker
- Docker Compose

## Project Structure

```text
SmartAppointmentQueue/
│
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   ├── services/
│   │   └── ...
│   └── package.json
│
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   ├── routes/
│   │   ├── services/
│   │   ├── middleware/
│   │   ├── utils/
│   │   └── config/
│   ├── prisma/
│   │   └── schema.prisma
│   └── package.json
│
├── docker-compose.yml
└── README.md