const API_URL = 'http://localhost:3000/api';

export const RideService = {
  getAllRides: (filters?: { origin?: string; destination?: string; date?: string; originLat?: number; originLng?: number; destLat?: number; destLng?: number; radius?: number }) => {
    const params = new URLSearchParams();
    if (filters?.origin) params.append('origin', filters.origin);
    if (filters?.destination) params.append('destination', filters.destination);
    if (filters?.date) params.append('date', filters.date);
    if (filters?.originLat !== undefined) params.append('originLat', filters.originLat.toString());
    if (filters?.originLng !== undefined) params.append('originLng', filters.originLng.toString());
    if (filters?.destLat !== undefined) params.append('destLat', filters.destLat.toString());
    if (filters?.destLng !== undefined) params.append('destLng', filters.destLng.toString());
    if (filters?.radius !== undefined) params.append('radius', filters.radius.toString());
    const qs = params.toString() ? `?${params.toString()}` : '';
    return fetch(`${API_URL}/rides${qs}`).then((res) => res.json());
  },
  createRide: (ride: any) => {
    return fetch(`${API_URL}/rides`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ride),
    }).then((res) => res.json());
  },
  getRideById: (rideId: string) => {
    return fetch(`${API_URL}/rides/${rideId}`).then((res) => res.json());
  },
  bookRide: (rideId: string, passenger: any) => {
    return fetch(`${API_URL}/rides/${rideId}/book`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(passenger),
    }).then((res) => res.json());
  },
  updateRideStatus: (rideId: string, status: 'scheduled' | 'ongoing' | 'completed' | 'cancelled') => {
    return fetch(`${API_URL}/rides/${rideId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    }).then((res) => res.json());
  },
  updateRideTracking: (
    rideId: string,
    location: {
      driverId: string;
      lat: number;
      lng: number;
      heading?: number | null;
      speed?: number | null;
      accuracy?: number | null;
      timestamp?: string;
    }
  ) => {
    return fetch(`${API_URL}/rides/${rideId}/tracking`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(location),
    }).then((res) => res.json());
  },
  getRideTracking: (rideId: string) => {
    return fetch(`${API_URL}/rides/${rideId}/tracking`).then((res) => res.json());
  },
  deleteRide: (rideId: string) => {
    return fetch(`${API_URL}/rides/${rideId}`, {
      method: 'DELETE',
    }).then((res) => res.json());
  },
};
