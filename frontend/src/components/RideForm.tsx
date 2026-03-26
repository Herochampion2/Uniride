import React, { useState } from 'react';
import { RideService } from '../services/RideService';
import { Ride } from '../models/Ride';
import { User } from '../models/User';
import { MapPin, Navigation, Calendar, Users, DollarSign } from 'lucide-react';

interface RideFormProps {
  user: User;
  onRideCreated: (ride: Ride) => void;
}

const RideForm: React.FC<RideFormProps> = ({ user, onRideCreated }) => {
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [departureTime, setDepartureTime] = useState('');
  const [availableSeats, setAvailableSeats] = useState(1);
  const [cost, setCost] = useState(0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newRide = {
      driver: user,
      origin,
      destination,
      departureTime: new Date(departureTime),
      availableSeats,
      cost,
    };
    RideService.createRide(newRide).then(onRideCreated);
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-grid">
        <div className="form-group">
          <label>
            <MapPin size={16} className="inline-block" style={{marginRight: '4px'}} />
            Origin
          </label>
          <input
            type="text"
            value={origin}
            onChange={(e) => setOrigin(e.target.value)}
            placeholder="Where are you starting?"
            required
          />
        </div>
        <div className="form-group">
          <label>
            <Navigation size={16} className="inline-block" style={{marginRight: '4px'}} />
            Destination
          </label>
          <input
            type="text"
            value={destination}
            onChange={(e) => setDestination(e.target.value)}
            placeholder="Where are you going?"
            required
          />
        </div>
        <div className="form-group">
          <label>
            <Calendar size={16} className="inline-block" style={{marginRight: '4px'}} />
            Departure Time
          </label>
          <input
            type="datetime-local"
            value={departureTime}
            onChange={(e) => setDepartureTime(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label>
            <Users size={16} className="inline-block" style={{marginRight: '4px'}} />
            Available Seats
          </label>
          <input
            type="number"
            min="1"
            value={availableSeats}
            onChange={(e) => setAvailableSeats(Number(e.target.value))}
            required
          />
        </div>
        <div className="form-group">
          <label>
            <DollarSign size={16} className="inline-block" style={{marginRight: '4px'}} />
            Total Cost
          </label>
          <input
            type="number"
            min="0"
            value={cost}
            onChange={(e) => setCost(Number(e.target.value))}
            required
          />
        </div>
      </div>
      <button type="submit" style={{marginTop: '1rem'}}>Share This Ride</button>
    </form>
  );
};

export default RideForm;
