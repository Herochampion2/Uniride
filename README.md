# UniRide - Dynamic Carpool System for University Students

UniRide is a dynamic carpooling platform specifically designed for university students to commute efficiently. It connects students with similar routes, enabling them to share rides, reduce travel costs, and foster a sustainable campus community.

## 🚀 Key Features

- **Smart Route Matching**: Automatically identifies and matches users with overlapping routes and compatible schedules.
- **Dynamic Pricing Engine**:
  - **Distance-based Fares**: Fair pricing based on kilometers traveled.
  - **Campus Zone Flat-Rates**: Affordable fixed pricing (₹20 for 2-wheelers, ₹35 for 4-wheelers) within a 2km radius of campus centers.
  - **High Occupancy Incentives**: 15% discount for rides with 3 or more passengers.
  - **Progressive Discounts**: Early bookers receive better rates to encourage early planning.
- **Real-time Journey Tracking**: Interactive map interface using Leaflet for tracking rides and sequences.
- **Integrated Authentication**: Secure login using Google OAuth 2.0.
- **Role-based Experience**: Separate workflows for offering rides (Drivers) and finding rides (Passengers).
- **Dashboard & History**: Comprehensive overview of active rides, saved routes, and user profile.

## 🛠️ Tech Stack

### Frontend
- **Framework**: [React](https://reactjs.org/) (v18) with [Vite](https://vitejs.dev/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Mapping**: [Leaflet](https://leafletjs.org/) & [React-Leaflet](https://react-leaflet.js.org/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Authentication**: [@react-oauth/google](https://github.com/MomenSherif/react-oauth)
- **Styling**: Vanilla CSS (Custom layouts for Dashboard, Maps, and Auth)

### Backend
- **Runtime**: [Node.js](https://nodejs.org/)
- **Framework**: [Express.js](https://expressjs.com/) (v5 Beta)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Database**: [LowDB](https://github.com/typicode/lowdb) (Local JSON database for development)
- **Auth**: [google-auth-library](https://github.com/googleapis/google-auth-library-nodejs)

## 📂 Project Structure

```
UniRide/
├── backend/                # Express server & Business logic
│   ├── src/
│   │   ├── models/        # Ride, Route, and User types
│   │   ├── routes/        # API endpoints (users, rides, routes)
│   │   ├── MatchingService.ts # Route matching algorithm
│   │   ├── PricingService.ts  # Fare calculation engine
│   │   └── PickupSequenceService.ts # Optimal sequence logic
│   └── package.json
├── frontend/               # Vite + React application
│   ├── src/
│   │   ├── components/    # Reusable UI (Maps, Forms, etc.)
│   │   ├── pages/         # Application views (Dashboard, FindRide, etc.)
│   │   ├── services/      # API communication layer
│   │   └── styles/        # Feature-specific CSS
│   └── package.json
└── PRICING_GUIDE.md        # Detailed documentation of the pricing model
```

## 🚥 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher)
- npm or yarn

### 1. Backend Setup
```bash
cd backend
npm install
# Create a .env file (if required) with GOOGLE_CLIENT_ID
npm run dev
```
The server will start on `http://localhost:3000`.

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
The application will be available at `http://localhost:5173`.

## 💰 Pricing Model

UniRide uses a sophisticated pricing formula to ensure affordability:
- **Base Fee**: ₹10 (4-wheeler) / ₹5 (2-wheeler)
- **Per Km**: ₹4/km (4-wheeler) / ₹2.5/km (2-wheeler)
- **Incentive**: 15% discount for 3+ passengers.
- **Campus Zone**: Flat ₹35 (car) / ₹20 (bike) for intra-campus trips.

For more details, refer to the [PRICING_GUIDE.md](./PRICING_GUIDE.md).

## 📄 License
This project is licensed under the ISC License.

# UniRide - Dynamic Carpool System for University Students

UniRide is a dynamic carpooling platform specifically designed for university students to commute efficiently. It connects students with similar routes, enabling them to share rides, reduce travel costs, and foster a sustainable campus community.

## 🚀 Key Features

- **Smart Route Matching**: Automatically identifies and matches users with overlapping routes and compatible schedules.
- **Dynamic Pricing Engine**:
  - **Distance-based Fares**: Fair pricing based on kilometers traveled.
  - **Campus Zone Flat-Rates**: Affordable fixed pricing (₹20 for 2-wheelers, ₹35 for 4-wheelers) within a 2km radius of campus centers.
  - **High Occupancy Incentives**: 15% discount for rides with 3 or more passengers.
  - **Progressive Discounts**: Early bookers receive better rates to encourage early planning.
- **Real-time Journey Tracking**: Interactive map interface using Leaflet for tracking rides and sequences.
- **Integrated Authentication**: Secure login using Google OAuth 2.0.
- **Role-based Experience**: Separate workflows for offering rides (Drivers) and finding rides (Passengers).
- **Dashboard & History**: Comprehensive overview of active rides, saved routes, and user profile.

## 🛠️ Tech Stack

### Frontend
- **Framework**: [React](https://reactjs.org/) (v18) with [Vite](https://vitejs.dev/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Mapping**: [Leaflet](https://leafletjs.org/) & [React-Leaflet](https://react-leaflet.js.org/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Authentication**: [@react-oauth/google](https://github.com/MomenSherif/react-oauth)
- **Styling**: Vanilla CSS (Custom layouts for Dashboard, Maps, and Auth)

### Backend
- **Runtime**: [Node.js](https://nodejs.org/)
- **Framework**: [Express.js](https://expressjs.com/) (v5 Beta)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Database**: [LowDB](https://github.com/typicode/lowdb) (Local JSON database for development)
- **Auth**: [google-auth-library](https://github.com/googleapis/google-auth-library-nodejs)

## 📂 Project Structure

```
UniRide/
├── backend/                # Express server & Business logic
│   ├── src/
│   │   ├── models/        # Ride, Route, and User types
│   │   ├── routes/        # API endpoints (users, rides, routes)
│   │   ├── MatchingService.ts # Route matching algorithm
│   │   ├── PricingService.ts  # Fare calculation engine
│   │   └── PickupSequenceService.ts # Optimal sequence logic
│   └── package.json
├── frontend/               # Vite + React application
│   ├── src/
│   │   ├── components/    # Reusable UI (Maps, Forms, etc.)
│   │   ├── pages/         # Application views (Dashboard, FindRide, etc.)
│   │   ├── services/      # API communication layer
│   │   └── styles/        # Feature-specific CSS
│   └── package.json
└── PRICING_GUIDE.md        # Detailed documentation of the pricing model
```

## 🚥 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher)
- npm or yarn

### 1. Backend Setup
```bash
cd backend
npm install
# Create a .env file (if required) with GOOGLE_CLIENT_ID
npm run dev
```
The server will start on `http://localhost:3000`.

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
The application will be available at `http://localhost:5173`.

## 💰 Pricing Model

UniRide uses a sophisticated pricing formula to ensure affordability:
- **Base Fee**: ₹10 (4-wheeler) / ₹5 (2-wheeler)
- **Per Km**: ₹4/km (4-wheeler) / ₹2.5/km (2-wheeler)
- **Incentive**: 15% discount for 3+ passengers.
- **Campus Zone**: Flat ₹35 (car) / ₹20 (bike) for intra-campus trips.

For more details, refer to the [PRICING_GUIDE.md](./PRICING_GUIDE.md).

## 📄 License
This project is licensed under the ISC License.
