const API_URL = '/api';

const fetchJson = async (url: string, init?: RequestInit) => {
  const res = await fetch(url, init);
  const contentType = res.headers.get('content-type') || '';
  const body = contentType.includes('application/json') ? await res.json() : await res.text();

  if (!res.ok) {
    const message = typeof body === 'string' ? body : JSON.stringify(body);
    throw new Error(message || `Request failed with status ${res.status}`);
  }

  return body;
};

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
    return fetchJson(`${API_URL}/rides${qs}`);
  },
  createRide: (ride: any) => {
    return fetchJson(`${API_URL}/rides`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ride),
    });
  },
  getRideById: (rideId: string) => {
    return fetchJson(`${API_URL}/rides/${rideId}`);
  },
  getJourney: (rideId: string) => {
    return fetchJson(`${API_URL}/journey/${rideId}`);
  },
  getRidePursuers: (rideId: string) => {
    return fetchJson(`${API_URL}/rides/${rideId}/pursuers`);
  },
  bookRide: (rideId: string, passenger: any) => {
    return fetchJson(`${API_URL}/rides/${rideId}/book`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(passenger),
    });
  },
  updateRideStatus: (rideId: string, status: 'PENDING' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED') => {
    return fetchJson(`${API_URL}/rides/${rideId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
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
    return fetchJson(`${API_URL}/rides/${rideId}/tracking`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(location),
    });
  },
  getRideTracking: (rideId: string) => {
    return fetchJson(`${API_URL}/rides/${rideId}/tracking`);
  },
  deleteRide: (rideId: string) => {
    return fetchJson(`${API_URL}/rides/${rideId}`, {
      method: 'DELETE',
    });
  },
  cancelRideByDriver: (rideId: string, driverId: string) => {
    return fetchJson(`${API_URL}/rides/${rideId}/cancel/driver`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ driverId }),
    });
  },
  cancelBookingByPassenger: (rideId: string, passengerId: string) => {
    return fetchJson(`${API_URL}/rides/${rideId}/cancel/passenger`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passengerId }),
    });
  },
};
