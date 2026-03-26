import React, { useState } from 'react';
import { RouteService } from '../services/RouteService';
import { Route } from '../models/Route';
import { User } from '../models/User';

interface RouteFormProps {
  user: User;
  onRouteCreated: (data: { newRoute: Route; matches: Route[] }) => void;
}

const RouteForm: React.FC<RouteFormProps> = ({ user, onRouteCreated }) => {
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [days, setDays] = useState<string[]>([]);
  const [time, setTime] = useState('');

  const handleDayChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value, checked } = e.target;
    if (checked) {
      setDays([...days, value]);
    } else {
      setDays(days.filter((day) => day !== value));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newRoute = {
      user,
      origin,
      destination,
      days,
      time,
    };
    RouteService.createRoute(newRoute).then(onRouteCreated);
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>Add a Route</h2>
      <div>
        <label>Origin</label>
        <input
          type="text"
          value={origin}
          onChange={(e) => setOrigin(e.target.value)}
          required
        />
      </div>
      <div>
        <label>Destination</label>
        <input
          type="text"
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
          required
        />
      </div>
      <div>
        <label>Time</label>
        <input
          type="time"
          value={time}
          onChange={(e) => setTime(e.target.value)}
          required
        />
      </div>
      <div>
        <label>Days</label>
        <div>
          {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
            <label key={day}>
              <input type="checkbox" value={day} onChange={handleDayChange} />
              {day}
            </label>
          ))}
        </div>
      </div>
      <button type="submit">Add Route</button>
    </form>
  );
};

export default RouteForm;
