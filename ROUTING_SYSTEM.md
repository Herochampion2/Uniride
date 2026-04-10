# UniRide - Hybrid Map & Routing System

## Overview

A comprehensive enhancement to UniRide's mapping capabilities with multi-stop routing and dynamic pricing for university ride-sharing.

## 🚀 Features

### Map & Routing System
- **Leaflet-powered Maps**: Interactive maps with university landmarks and custom markers
- **Multi-stop Routing**: Calculate optimized routes for drivers and multiple passengers
- **Real-time Route Visualization**: Draw routes on map with OSRM (Open Source Routing Machine)
- **Waypoint Management**: Add/remove driver location, pickup points, and dropoff points
- **Dynamic Updates**: Recalculate routes and pricing when passengers are added/removed

### Pricing Models
- **Fuel Sharing**: Split fuel costs equally among all participants (driver + passengers)
- **Distance-based**: Charge per kilometer traveled by each passenger
- **Flexible Configuration**: Support for different vehicle types (2-wheeler/4-wheeler)

### API Integration
- **OSRM Routing**: Free, open-source routing service for accurate directions
- **Distance Matrix**: Calculate distances between multiple points
- **Route Optimization**: Find optimal pickup/dropoff sequences

## 🏗️ Architecture

### Backend (Node.js + Express)
```
backend/src/
├── RoutingService.ts      # OSRM API integration
├── PricingService.ts      # Enhanced with fuel-sharing & distance-based pricing
└── routes/
    └── routing.ts         # API endpoints for routing & pricing
```

### Frontend (React + TypeScript)
```
frontend/src/
├── components/
│   ├── MapUI.tsx          # Enhanced Leaflet map component
│   └── RidePlanner.tsx    # Interactive route planning interface
└── services/
    └── RoutingService.ts  # Frontend API client
```

## 🔧 API Endpoints

### Routing Endpoints
- `POST /api/routing/calculate-route` - Calculate route for multiple waypoints
- `POST /api/routing/distance-matrix` - Calculate distances between point pairs
- `POST /api/routing/calculate-ride-pricing` - Calculate pricing for ride with passengers

### Pricing Endpoints
- `POST /api/routing/fuel-sharing` - Calculate fuel-sharing pricing
- `POST /api/routing/distance-based` - Calculate distance-based pricing

## 💡 Usage Examples

### Basic Route Calculation
```javascript
const waypoints = [
  { lat: 28.6139, lng: 77.2090, name: "Delhi" },
  { lat: 28.5450, lng: 77.1926, name: "IIT Delhi" }
];

const route = await RoutingService.calculateRoute(waypoints);
// Returns: { totalDistance: 9.65, totalDuration: 681.4, geometry: {...} }
```

### Fuel Sharing Pricing
```javascript
const pricing = await RoutingService.calculateFuelSharing({
  totalDistance: 15,      // km
  fuelRatePerKm: 2,       // ₹/km
  numberOfPeople: 3,      // driver + 2 passengers
  minimumFare: 10
});
// Returns: { fuelCost: 30, passengerFare: 10, totalCost: 30, driverContribution: 0 }
```

### Distance-based Pricing
```javascript
const pricing = await RoutingService.calculateRidePricing({
  driverLocation: { lat: 28.6139, lng: 77.2090 },
  passengerStops: [{
    pickup: { lat: 28.6, lng: 77.2 },
    dropoff: { lat: 28.55, lng: 77.19 },
    passengerId: "pass1"
  }],
  vehicleType: "2-wheeler",
  useFuelSharing: false,
  ratePerKm: 4
});
```

## 🎯 Key Components

### MapUI Component
- Supports multiple waypoint types (driver, pickup, dropoff)
- Real-time route drawing with OSRM
- Click-to-add waypoints functionality
- Responsive design with university landmarks

### RidePlanner Component
- Interactive route planning interface
- Real-time pricing calculations
- Support for both fuel-sharing and distance-based models
- Dynamic waypoint management

### RoutingService (Backend)
- OSRM integration for accurate routing
- Distance matrix calculations
- Route optimization algorithms
- Error handling and fallbacks

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

1. **Backend should already be running** on `http://localhost:3000`
2. **Frontend should already be running** on `http://localhost:5174`

### Demo
1. Navigate to `/ride-planner` in the application
2. Click on the map to set driver location
3. Click again to add passenger pickup/dropoff points
4. Watch routes and pricing update in real-time
5. Toggle between fuel-sharing and distance-based pricing

## 🔧 Configuration

### Environment Variables
```env
# Backend
PORT=3000

# OSRM Configuration (built-in)
OSRM_BASE_URL=https://router.project-osrm.org
```

### Pricing Configuration
```typescript
const pricingConfig = {
  vehicleType: '2-wheeler' | '4-wheeler',
  fuelRatePerKm: 2,        // For fuel sharing
  ratePerKm: 4,           // For distance-based
  minimumFare: 10
};
```

## 📊 Technical Highlights

- **Cost-Effective**: Uses free OSRM instead of paid Google Maps API
- **Scalable**: Modular architecture supports easy extension
- **Real-time**: Dynamic route recalculation on passenger changes
- **Accurate**: Actual road network distances vs straight-line approximations
- **Flexible**: Multiple pricing models for different use cases

## 🎓 University Context

Designed specifically for university students with:
- Campus zone pricing (flat rates within university areas)
- Multiple university landmarks pre-loaded
- Student-friendly pricing models
- Support for bike/carpooling scenarios

## 🔮 Future Enhancements

- Real-time GPS tracking integration
- Advanced route optimization algorithms
- Integration with ride-matching system
- Mobile app development
- Historical route analytics

---

**Built with ❤️ for university students by the UniRide team**</content>
<parameter name="filePath">/home/yash/Desktop/uniride/UniRide/ROUTING_SYSTEM.md