# Smart Appointment & Queue Management System

A full-stack appointment and queue management system supporting
customers, staff and administrators.

## Tech Stack

### Frontend
- React
- TypeScript
- Vite

### Backend
- Node.js
- Express
- TypeScript
- Prisma

### Database
- PostgreSQL

### Caching / Queue
- Redis
- BullMQ

## Features

### Authentication
- Customer registration
- Login
- JWT authentication
- Refresh tokens
- Role-based access

### Admin
- Manage branches
- Manage services
- Manage resources
- Assign resources to services
- Configure business hours
- Configure holidays

### Appointments
- Check availability
- Temporary reservations
- Book appointments
- Idempotency protection
- Cancel appointments
- Reschedule appointments

### Waitlist
- Join waitlist
- View position
- Leave waitlist

### Queue
- Walk-in customers
- Priority queue
- Check-in
- Call next customer
- Start service
- Complete service
- Skip customer
- Cancel queue entry

### Notifications
- Appointment confirmation
- Cancellation notification
- Read/unread notifications

### Infrastructure
- PostgreSQL
- Redis
- BullMQ
- Docker Compose

## Running the Project

### Start infrastructure

```bash
docker compose up -d