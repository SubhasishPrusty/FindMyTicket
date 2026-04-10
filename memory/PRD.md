# Find My Tickets - Product Requirements Document

## Overview
**Find My Tickets** is a mobile app for tracking flight tickets. It solves the problem of messy inboxes by consolidating all flight tickets in one clean, professional interface.

## Tech Stack
- **Frontend**: React Native (Expo SDK 54) with Expo Router
- **Backend**: FastAPI (Python) with Motor (async MongoDB driver)
- **Database**: MongoDB
- **AI**: OpenAI GPT-5.2 via Emergent LLM Key (ticket image parsing)
- **Flight Status**: AviationStack API (abstracted for easy provider swap)

## Features

### Core Features (Implemented)
1. **Phone + PIN Authentication** - Register/login with phone number and 6-digit PIN
2. **Dashboard** - Scrollable list of ticket cards organized by upcoming/past flights
3. **Ticket Cards** - Display airline, flight number, origin/destination codes, date, PNR, passenger names (up to 3 + "+n")
4. **Ticket Detail View** - Full boarding pass style display with all info: airline, flight number, route, times, gate, terminal, seat, PNR, full passenger list
5. **Manual Ticket Entry** - Comprehensive form with all flight fields + multiple passengers
6. **Upload Ticket (AI Parsing)** - Camera, gallery, or document upload → GPT-5.2 extracts flight info → User reviews and confirms
7. **Share Ticket** - Share flight details with referral message via native share sheet
8. **Web Check-in Redirect** - Direct links to airline web check-in pages
9. **Flight Status** - Search by flight number (AviationStack API with graceful fallback)
10. **Profile & Logout** - User info display, settings menu, logout

### Planned Features
- Gmail integration (Google OAuth) for automatic ticket scanning
- OTP verification for first-time login
- Push notification reminders for upcoming flights
- Shareable ticket image generation
- Connect Gmail feature for email scanning

## API Endpoints
- `POST /api/auth/register` - Register with name, phone, PIN
- `POST /api/auth/login` - Login with phone, PIN
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout
- `GET /api/tickets` - List user's tickets
- `POST /api/tickets` - Create ticket manually
- `GET /api/tickets/{id}` - Get ticket detail
- `PUT /api/tickets/{id}` - Update ticket
- `DELETE /api/tickets/{id}` - Delete ticket
- `POST /api/tickets/parse` - AI parse uploaded ticket image
- `GET /api/flight-status/{flight_number}` - Check flight status

## Database Collections
- `users` - User accounts (user_id, name, phone, pin_hash)
- `tickets` - Flight tickets (ticket_id, user_id, pnr, airline, flight details, passengers)

## Environment Variables
### Backend (.env)
- `MONGO_URL` - MongoDB connection string
- `DB_NAME` - Database name
- `JWT_SECRET` - JWT signing secret
- `EMERGENT_LLM_KEY` - AI parsing key
- `AVIATIONSTACK_API_KEY` - Flight status API key (optional)

### Frontend (.env)
- `EXPO_PUBLIC_BACKEND_URL` - Backend API URL

## Design
- **Theme**: Clean minimal aviation (Swiss High-Contrast archetype)
- **Colors**: Navy (#0A192F) text, Blue (#0055FF) brand, Light (#F8F9FA) background
- **Layout**: Card-based with boarding pass style separators
- **Navigation**: Bottom tabs (My Tickets, Flight Status, Profile)
