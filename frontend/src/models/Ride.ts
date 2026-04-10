import { User } from './User';

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface Ride {
  id: string;
  driver: User;
  passengers: User[];
  origin: string;
  destination: string;
  originCoords?: Coordinates;
  destinationCoords?: Coordinates;
  departureTime: Date;
  availableSeats: number;
  cost: number;
  vehicleType?: 'two-wheeler' | 'four-wheeler';
  status: 'PENDING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
}
