import { User } from '../models/User';

const API_URL = '/api';

export class UserService {
  static getUsers(): Promise<User[]> {
    return fetch(`${API_URL}/users`).then((res) => res.json());
  }

  static getUser(id: string): Promise<User | undefined> {
    return fetch(`${API_URL}/users/${id}`).then((res) => res.json());
  }

  static getUserById(id: string): Promise<User | undefined> {
    return this.getUser(id);
  }

  static signup(userData: any): Promise<User> {
    return fetch(`${API_URL}/users/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(userData),
    }).then((res) => {
        if (!res.ok) {
            return res.json().then(err => { throw new Error(err.error) });
        }
        return res.json();
    });
  }

  static login(credentials: any): Promise<User> {
    return fetch(`${API_URL}/users/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(credentials),
    }).then((res) => {
        if (!res.ok) {
            return res.json().then(err => { throw new Error(err.error) });
        }
        return res.json();
    });
  }

  static googleLogin(token: string): Promise<User> {
    return fetch(`${API_URL}/users/google-login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token }),
    }).then((res) => {
        if (!res.ok) {
            return res.json().then(err => { throw new Error(err.error) });
        }
        return res.json();
    });
  }

  static submitVerification(
    userId: string,
    payload: { studentIdNumber: string; licenseNumber: string; vehicleRegNumber: string }
  ): Promise<{ message: string; user: User }> {
    return fetch(`${API_URL}/users/${userId}/verification/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    }).then((res) => {
      if (!res.ok) {
        return res.json().then(err => { throw new Error(err.error); });
      }
      return res.json();
    });
  }

  static getPendingVerifications(): Promise<User[]> {
    return fetch(`${API_URL}/users/verification/pending`).then((res) => res.json());
  }

  static reviewVerification(
    userId: string,
    payload: { status: 'verified' | 'rejected'; reviewerNote?: string }
  ): Promise<{ message: string; user: User }> {
    return fetch(`${API_URL}/users/${userId}/verification/review`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    }).then((res) => {
      if (!res.ok) {
        return res.json().then(err => { throw new Error(err.error); });
      }
      return res.json();
    });
  }
}
