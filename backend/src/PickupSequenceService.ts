import { User } from './models/User';

export class PickupSequenceService {
  static getPickupSequence(passengers: User[]): User[] {
    // For now, we'll return the passengers in the order they were added.
    // A more advanced implementation would calculate the optimal pickup
    // sequence based on their locations.
    return passengers;
  }
}
