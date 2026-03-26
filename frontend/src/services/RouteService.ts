const API_URL = 'http://localhost:3000/api';

export const RouteService = {
  getUserRoutes: (userId: string) => {
    return fetch(`${API_URL}/routes/${userId}`).then((res) => res.json());
  },
  createRoute: (route: any) => {
    return fetch(`${API_URL}/routes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(route),
    }).then((res) => res.json());
  },
  deleteRoute: (routeId: string) => {
    return fetch(`${API_URL}/routes/${routeId}`, {
      method: 'DELETE',
    }).then((res) => res.json());
  },
};
