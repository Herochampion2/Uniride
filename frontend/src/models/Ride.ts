import { User } from './User';

export interface Ride {
  id: string;
  driver: User;
  passengers: User[];
  origin: string;
  destination: string;
  departureTime: Date;
  availableSeats: number;
  cost: number;
  vehicleType?: 'two-wheeler' | 'four-wheeler';
}
