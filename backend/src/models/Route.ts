import { User } from './User';

export interface Route {
  id: string;
  user: User;
  origin: string;
  destination: string;
  days: string[]; // e.g., ['Monday', 'Wednesday', 'Friday']
  time: string; // e.g., '08:00 AM'
}
