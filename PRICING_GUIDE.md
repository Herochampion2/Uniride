# UniRide Pricing Configuration Guide

This guide explains the pricing system implemented according to the UniRide pricing configuration prompt.

## Overview

The pricing system implements a dynamic, context-aware fare calculation that includes:
- Base pickup fees differentiated by vehicle type
- Distance-based per-kilometer rates
- Campus zone flat-rate pricing
- Empty seat incentive discounts
- Platform service fees

## Core Configuration

### Default Pricing Configuration

```typescript
{
  vehicleType: '4-wheeler',
  basePickupFee: 10,           // ₹10 for 4-wheeler, ₹5 for 2-wheeler
  perKmRate: 4,                // ₹4/km for 4-wheeler, ₹2.50/km for 2-wheeler
  platformFeePercent: 0,       // Currently 0% (Beta), will be 7% post-launch
  platformFeeCap: 15,          // Platform fee capped at ₹15
  emptySeatIncentivePassengers: 3,  // Trigger at 3+ passengers
  emptySeatDiscount: 0.15,     // 15% discount on per-km rate
  campusZoneRadius: 2,         // 2km radius around campus center
  campusZoneCenter: { lat: 28.5450, lng: 77.1926 },  // IIT Delhi
  campusZoneFlatRates: { bike: 20, car: 35 }  // Flat rates in campus zone
}
```

## Pricing Formula

### Base Fare Calculation
$$F_{base} = BasePickupFee + (Distance \times PerKmRate)$$

### Empty Seat Incentive (3+ passengers)
If passenger count ≥ 3:
$$F_{after\_discount} = F_{base} \times (1 - 0.15) = F_{base} \times 0.85$$

### Campus Zone Flat-Rate
If both origin AND destination are within 2km of campus center:
- **2-Wheeler**: ₹20 (regardless of distance)
- **4-Wheeler**: ₹35 (regardless of distance)

### Platform Service Fee
$$F_{final} = F_{after\_discount} + min(F_{after\_discount} \times PlatformFee\%, ₹15)$$

Current (Beta): 0%
Post-Launch: 7% (capped at ₹15)

## Vehicle Types

### Vehicle Type A (4-Wheeler)
- **Base Pickup Fee**: ₹10.00 per rider
- **Per Kilometer Rate**: ₹4.00/km
- **Campus Zone Flat-Rate**: ₹35.00

### Vehicle Type B (2-Wheeler)
- **Base Pickup Fee**: ₹5.00 per rider
- **Per Kilometer Rate**: ₹2.50/km
- **Campus Zone Flat-Rate**: ₹20.00

## Creating a Ride

### Example: Creating a 4-Wheeler Ride

```json
{
  "driver": {
    "id": "driver123",
    "name": "John Doe",
    "email": "john@example.com"
  },
  "origin": "IIT Delhi Main Gate",
  "originCoords": {
    "lat": 28.5450,
    "lng": 77.1926
  },
  "destination": "Delhi Tech University",
  "destinationCoords": {
    "lat": 28.7499,
    "lng": 77.1165
  },
  "distance": 22.5,
  "departureTime": "2026-03-24T10:00:00Z",
  "availableSeats": 3,
  "cost": 90,
  "pricingConfig": {
    "vehicleType": "4-wheeler",
    "basePickupFee": 10,
    "perKmRate": 4,
    "platformFeePercent": 0,
    "platformFeeCap": 15,
    "emptySeatIncentivePassengers": 3,
    "emptySeatDiscount": 0.15,
    "campusZoneRadius": 2,
    "campusZoneCenter": {
      "lat": 28.5450,
      "lng": 77.1926
    },
    "campusZoneFlatRates": {
      "bike": 20,
      "car": 35
    }
  }
}
```

## Booking and Fare Calculation

### Scenario 1: Single Passenger (No Empty Seat Incentive)

**Ride Details**:
- Vehicle: 4-Wheeler
- Distance: 22.5 km
- Passenger Count: 1

**Calculation**:
1. Base Fare = ₹10 + (22.5 × ₹4) = ₹10 + ₹90 = ₹100
2. Empty Seat Incentive: Not applied (only 1 passenger)
3. Fare After Discount = ₹100
4. Platform Fee (0% in Beta) = ₹0
5. **Final Fare = ₹100**

### Scenario 2: Multiple Passengers with Empty Seat Incentive

**Ride Details**:
- Vehicle: 4-Wheeler
- Distance: 22.5 km
- Passenger Count: 3+

**Calculation for each passenger**:
1. Base Fare = ₹10 + (22.5 × ₹4) = ₹100
2. Empty Seat Incentive Applied: 15% discount on the calculation
3. Fare After Discount = ₹100 × 0.85 = ₹85
4. Platform Fee = ₹0 (Beta)
5. **Final Fare = ₹85**

**Savings**: Each passenger saves ₹15 (15% discount)

### Scenario 3: Campus Zone Flat-Rate

**Ride Details**:
- Vehicle: 4-Wheeler
- Origin: IIT Delhi Main Gate (28.5450, 77.1926)
- Destination: NSUT Dwarka (28.6083, 77.0398)
- Both within 2km campus zone boundary

**Calculation**:
1. Campus Zone Detected: Apply flat-rate
2. **Final Fare = ₹35** (regardless of actual distance)

**Savings**: Campus zone provides affordable fixed-price rides

## API Endpoints

### Calculate Final Fare (Helper)

The `PricingService.calculateFinalFare()` method returns detailed breakdown:

```typescript
{
  baseFare: number;
  afterDiscount: number;
  platformFee: number;
  finalFare: number;
  campusZoneApplied: boolean;
  emptySeatApplied: boolean;
}
```

### Create a Ride

```
POST /api/rides
Content-Type: application/json

[Ride object with pricingConfig]
```

### Book a Ride

```
POST /api/rides/{rideId}/book
Content-Type: application/json

{
  "id": "passenger123",
  "name": "Jane Smith",
  "email": "jane@example.com",
  "university": "Delhi University",
  "phone": "+91-XXXXXXXXXX",
  "distanceKm": 22.5
}
```

## Features & Benefits

### ✅ Campus Affordability
- Flat-rate pricing within campus zone ensures predictable, affordable fares
- Riders near campus can plan trips without worrying about meters

### ✅ High Occupancy Incentive
- 15% discount kicks in automatically when ride reaches 3+ passengers
- Rewards carpooling and reduces per-person commute costs

### ✅ Flexible Platform Revenue
- Currently 0% commission (Beta phase)
- Post-launch: 7% service fee (capped at ₹15)
- Allows UniRide to remain sustainable while keeping rides affordable

### ✅ Vehicle-Type Differentiation
- 2-wheelers are cheaper than 4-wheelers (₹2.50/km vs ₹4/km)
- Supports multiple vehicle options for different needs and budgets

## Examples for Testing

### Cost Comparison: UniRide vs Traditional Taxis

**Scenario**: IIT Delhi → DTU distance ~22 km

**Traditional Auto-Rickshaw**: ₹400-500+
**UniRide (Single Rider)**: ₹100 (63-75% cheaper)
**UniRide (3+ Riders, with discount)**: ₹85 per person (82-87% cheaper)

This demonstrates UniRide's commitment to affordable campus transportation.

## Implementation Notes

- All monetary values are rounded to 2 decimal places
- Distances are calculated using the Haversine formula
- Campus zone detection uses geographic coordinates
- Progressive discounts for early bookers are still applied (legacy feature)
- Platform is prepared for future service fee implementation

## Transitioning to Post-Launch Pricing

When moving to production, update the `platformFeePercent`:

```javascript
// Current (Beta)
platformFeePercent: 0

// Post-Launch
platformFeePercent: 0.07  // Will add 7% to each fare
```

No code changes required—configuration update only!
