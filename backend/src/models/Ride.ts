import { User } from './User';

export type RideStatus = 'scheduled' | 'ongoing' | 'completed' | 'cancelled';
export type VehicleType = '4-wheeler' | '2-wheeler';

export interface DriverLocation {
  lat: number;
  lng: number;
  heading?: number | null;
  speed?: number | null;
  accuracy?: number | null;
  timestamp: string;
}

export interface RideTracking {
  isLive: boolean;
  lastUpdatedAt?: string;
  driverLocation?: DriverLocation;
}

export interface RidePricingConfig {
  vehicleType: VehicleType;
  basePickupFee: number;
  perKmRate: number;
  platformFeePercent: number;
  platformFeeCap: number;
  emptySeatIncentivePassengers: number;
  emptySeatDiscount: number;
  campusZoneRadius: number;
  campusZoneCenter: { lat: number; lng: number };
  campusZoneFlatRates: { bike: number; car: number };
  discountStep?: number;
  discountCap?: number;
  minFare?: number;
  baseCharge?: number;
}

export interface RidePassenger extends User {
  joinedAt: string;
  baseFare: number;
  distanceKm?: number;
  discountPercent: number;
  discountAmount: number;
  finalFare: number;
}

export interface Ride {
  id: string;
  driver: User;
  passengers: RidePassenger[];
  origin: string;
  destination: string;
  originCoords?: { lat: number; lng: number };
  destinationCoords?: { lat: number; lng: number };
  departureTime: Date;
  availableSeats: number;
  cost: number;
  status?: RideStatus;
  tracking?: RideTracking;
  pricingConfig?: RidePricingConfig;
  distance?: number;
}
