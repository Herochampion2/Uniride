import React, { useEffect, useState } from 'react';
import { RideService } from '../services/RideService';
import RideForm from '../components/RideForm';
import { User } from '../models/User';
import { UserService } from '../services/UserService';
import { GraduationCap } from 'lucide-react';

interface RideWithPickupSequence {
  id: string;
  driver: User;
  passengers: User[];
  origin: string;
  destination: string;
  departureTime: string | Date;
  availableSeats: number;
  cost: number;
  pickupSequence?: User[];
}

const HomePage: React.FC<{ userId?: string; setUserId?: (id: string) => void }> = ({ userId, setUserId }) => {
  const [user, setUser] = useState<User | undefined>();
  const [universities, setUniversities] = useState<string[]>([]);

  useEffect(() => {
    if (userId) {
      UserService.getUser(userId)
        .then(data => setUser(data))
        .catch(err => console.error("Failed to fetch user", err));
    } else {
      setUser(undefined);
    }

    setUniversities([
      'Guru Gobind Singh Indraprastha University (GGSIPU)',
      'University of Delhi (DU)',
      'Jamia Millia Islamia (JMI)',
      'Jawaharlal Nehru University (JNU)',
      'Indian Institute of Technology Delhi (IIT Delhi)',
      'Delhi Technological University (DTU)',
      'Netaji Subhas University of Technology (NSUT)',
      'Indira Gandhi Delhi Technical University for Women (IGDTUW)'
    ]);
  }, [userId]);

  const handleRideCreated = () => {
    alert('Ride Shared Successfully!');
  };

  const scrollToBook = () => {
    if (!userId) {
      window.location.href = '/login';
      return;
    }
    document.getElementById('book')?.scrollIntoView({ behavior: 'smooth' });
  };


  return (
    <div className="homepage">
      {/* Hero Section */}
      <section className="hero">
        <h1>UniRide</h1>
        <p>Eco-friendly, affordable student carpooling for Delhi's top campuses.</p>
        
        <button className="hero-btn" onClick={scrollToBook}>
          {userId ? 'Get Started' : 'Join Now'}
        </button>
      </section>

      <div className="container">
        {/* Universities Section */}
        <section id="universities">
          <h2 className="section-title">Serving Top <span>Delhi Universities</span></h2>
          <div className="uni-grid">
            {universities.map((uni, idx) => (
              <div key={idx} className="uni-card">
                <GraduationCap size={32} color="var(--primary)" style={{ marginBottom: '1rem' }} />
                <div style={{ fontWeight: '700', fontSize: '0.9rem' }}>{uni}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Booking Section */}
        {user && (
          <section id="book" className="white-section">
            <h2 className="section-title">Share Your <span>Ride</span></h2>
            <div className="form-container">
              <RideForm user={user} onRideCreated={handleRideCreated} />
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default HomePage;
