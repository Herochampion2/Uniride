import { User } from './User';

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface Route {
  id: string;
  user: User;
  origin: string;
  destination: string;
  originCoords?: Coordinates;
  destinationCoords?: Coordinates;
  days: string[]; // e.g., ['Monday', 'Wednesday', 'Friday']
  time: string; // e.g., '08:00 AM'
}
