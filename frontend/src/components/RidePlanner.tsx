import React, { useState, useCallback } from 'react';
import MapUI, { MapWaypoint } from './MapUI';
import RoutingService, { PricingResult, FuelSharingResult } from '../services/RoutingService';

interface PassengerStop {
  id: string;
  pickup: { lat: number; lng: number; name?: string };
  dropoff: { lat: number; lng: number; name?: string };
  passengerId: string;
}

const RidePlanner: React.FC = () => {
  const [waypoints, setWaypoints] = useState<MapWaypoint[]>([]);
  const [passengerStops, setPassengerStops] = useState<PassengerStop[]>([]);
  const [pricing, setPricing] = useState<PricingResult | null>(null);
  const [fuelSharingPricing, setFuelSharingPricing] = useState<FuelSharingResult | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [useFuelSharing, setUseFuelSharing] = useState(true);
  const [vehicleType, setVehicleType] = useState<'2-wheeler' | '4-wheeler'>('2-wheeler');
  const [fuelRatePerKm, setFuelRatePerKm] = useState(2);
  const [ratePerKm, setRatePerKm] = useState(4);

  // Add driver location
  const addDriverLocation = useCallback((lat: number, lng: number) => {
    const driverWaypoint: MapWaypoint = {
      id: 'driver',
      lat,
      lng,
      type: 'driver',
      name: 'Driver Start'
    };

    // Remove existing driver location
    setWaypoints(prev => prev.filter(w => w.type !== 'driver').concat(driverWaypoint));
  }, []);

  // Add pickup/dropoff point
  const addStop = useCallback((lat: number, lng: number) => {
    const stopId = `stop-${Date.now()}`;
    const pickupWaypoint: MapWaypoint = {
      id: `${stopId}-pickup`,
      lat,
      lng,
      type: 'pickup',
      name: `Pickup ${passengerStops.length + 1}`
    };

    setWaypoints(prev => prev.concat(pickupWaypoint));

    // For demo, create a dropoff point slightly offset
    const dropoffWaypoint: MapWaypoint = {
      id: `${stopId}-dropoff`,
      lat: lat + 0.01,
      lng: lng + 0.01,
      type: 'dropoff',
      name: `Dropoff ${passengerStops.length + 1}`
    };

    setWaypoints(prev => prev.concat(dropoffWaypoint));

    const newStop: PassengerStop = {
      id: stopId,
      pickup: { lat, lng, name: pickupWaypoint.name },
      dropoff: { lat: dropoffWaypoint.lat, lng: dropoffWaypoint.lng, name: dropoffWaypoint.name },
      passengerId: `passenger-${passengerStops.length + 1}`
    };

    setPassengerStops(prev => prev.concat(newStop));
  }, [passengerStops.length]);

  // Handle map click
  const handleMapClick = useCallback((lat: number, lng: number) => {
    if (waypoints.length === 0) {
      addDriverLocation(lat, lng);
    } else {
      addStop(lat, lng);
    }
  }, [waypoints.length, addDriverLocation, addStop]);

  // Remove waypoint
  const removeWaypoint = useCallback((waypointId: string) => {
    setWaypoints(prev => prev.filter(w => w.id !== waypointId));

    // If it's a pickup/dropoff pair, remove both
    if (waypointId.includes('-pickup')) {
      const baseId = waypointId.replace('-pickup', '');
      setWaypoints(prev => prev.filter(w => !w.id.startsWith(baseId)));
      setPassengerStops(prev => prev.filter(s => s.id !== baseId));
    } else if (waypointId.includes('-dropoff')) {
      const baseId = waypointId.replace('-dropoff', '');
      setWaypoints(prev => prev.filter(w => !w.id.startsWith(baseId)));
      setPassengerStops(prev => prev.filter(s => s.id !== baseId));
    }
  }, []);

  // Calculate pricing
  const calculatePricing = useCallback(async () => {
    const driverWaypoint = waypoints.find(w => w.type === 'driver');
    if (!driverWaypoint || passengerStops.length === 0) return;

    setIsCalculating(true);
    try {
      if (useFuelSharing) {
        // Calculate route first to get total distance
        const route = await RoutingService.calculateRoute(waypoints);
        if (route) {
          const fuelPricing = await RoutingService.calculateFuelSharing({
            totalDistance: route.totalDistance,
            fuelRatePerKm,
            numberOfPeople: passengerStops.length + 1, // +1 for driver
            minimumFare: 10
          });
          setFuelSharingPricing(fuelPricing);
        }
      } else {
        // Distance-based pricing
        const pricingResult = await RoutingService.calculateRidePricing({
          driverLocation: { lat: driverWaypoint.lat, lng: driverWaypoint.lng },
          passengerStops,
          vehicleType,
          useFuelSharing: false,
          ratePerKm,
          minimumFare: 10
        });
        setPricing(pricingResult);
      }
    } catch (error) {
      console.error('Pricing calculation failed:', error);
    } finally {
      setIsCalculating(false);
    }
  }, [waypoints, passengerStops, useFuelSharing, fuelRatePerKm, vehicleType, ratePerKm]);

  // Recalculate when parameters change
  React.useEffect(() => {
    if (waypoints.length > 1) {
      calculatePricing();
    }
  }, [calculatePricing]);

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      {/* Map Container */}
      <div style={{ flex: 1, position: 'relative' }}>
        <MapUI
          waypoints={waypoints}
          onMapClick={handleMapClick}
          onWaypointRemove={removeWaypoint}
          showRoute={true}
        />

        {/* Control Panel */}
        <div style={{
          position: 'absolute',
          top: 10,
          right: 10,
          background: 'white',
          padding: '15px',
          borderRadius: '8px',
          boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
          zIndex: 1000,
          minWidth: '300px'
        }}>
          <h3 style={{ margin: '0 0 15px 0', color: '#333' }}>Ride Planner</h3>

          {/* Instructions */}
          <div style={{ marginBottom: '15px', fontSize: '14px', color: '#666' }}>
            {waypoints.length === 0 ? 'Click on map to add driver location' :
             'Click on map to add passenger pickup/dropoff points'}
          </div>

          {/* Pricing Settings */}
          <div style={{ marginBottom: '15px' }}>
            <label style={{ display: 'block', marginBottom: '5px' }}>
              <input
                type="checkbox"
                checked={useFuelSharing}
                onChange={(e) => setUseFuelSharing(e.target.checked)}
              />
              {' '}Use Fuel Sharing (for bikes)
            </label>

            {useFuelSharing ? (
              <div style={{ marginTop: '10px' }}>
                <label>
                  Fuel Rate (₹/km):
                  <input
                    type="number"
                    value={fuelRatePerKm}
                    onChange={(e) => setFuelRatePerKm(Number(e.target.value))}
                    style={{ marginLeft: '5px', width: '60px' }}
                    min="0"
                    step="0.1"
                  />
                </label>
              </div>
            ) : (
              <div style={{ marginTop: '10px' }}>
                <label>
                  Vehicle:
                  <select
                    value={vehicleType}
                    onChange={(e) => setVehicleType(e.target.value as '2-wheeler' | '4-wheeler')}
                    style={{ marginLeft: '5px' }}
                  >
                    <option value="2-wheeler">2-wheeler</option>
                    <option value="4-wheeler">4-wheeler</option>
                  </select>
                </label>
                <br />
                <label style={{ marginTop: '5px', display: 'block' }}>
                  Rate (₹/km):
                  <input
                    type="number"
                    value={ratePerKm}
                    onChange={(e) => setRatePerKm(Number(e.target.value))}
                    style={{ marginLeft: '5px', width: '60px' }}
                    min="0"
                    step="0.1"
                  />
                </label>
              </div>
            )}
          </div>

          {/* Waypoints List */}
          {waypoints.length > 0 && (
            <div style={{ marginBottom: '15px' }}>
              <h4 style={{ margin: '0 0 10px 0', fontSize: '14px' }}>Waypoints:</h4>
              <div style={{ maxHeight: '150px', overflowY: 'auto' }}>
                {waypoints.map((wp, index) => (
                  <div key={wp.id} style={{
                    padding: '5px',
                    background: wp.type === 'driver' ? '#dbeafe' : wp.type === 'pickup' ? '#dcfce7' : '#fef3c7',
                    marginBottom: '2px',
                    borderRadius: '3px',
                    fontSize: '12px'
                  }}>
                    {index + 1}. {wp.name} ({wp.type})
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pricing Results */}
          {isCalculating && <div>Calculating...</div>}

          {fuelSharingPricing && useFuelSharing && (
            <div style={{ marginTop: '15px', padding: '10px', background: '#f0f9ff', borderRadius: '5px' }}>
              <h4 style={{ margin: '0 0 10px 0', fontSize: '14px' }}>Fuel Sharing Pricing:</h4>
              <div>Fuel Cost: ₹{fuelSharingPricing.fuelCost.toFixed(2)}</div>
              <div>Per Passenger: ₹{fuelSharingPricing.passengerFare.toFixed(2)}</div>
              <div>Total Cost: ₹{fuelSharingPricing.totalCost.toFixed(2)}</div>
              <div>Driver Contribution: ₹{fuelSharingPricing.driverContribution.toFixed(2)}</div>
            </div>
          )}

          {pricing && !useFuelSharing && (
            <div style={{ marginTop: '15px', padding: '10px', background: '#f0f9ff', borderRadius: '5px' }}>
              <h4 style={{ margin: '0 0 10px 0', fontSize: '14px' }}>Distance-Based Pricing:</h4>
              <div>Total Distance: {pricing.totalDistance.toFixed(2)} km</div>
              <div>Total Cost: ₹{pricing.totalCost.toFixed(2)}</div>
              <div>Driver Contribution: ₹{pricing.driverContribution.toFixed(2)}</div>
              <div style={{ marginTop: '10px' }}>
                <strong>Passenger Fares:</strong>
                {pricing.passengerFares.map((fare, index) => (
                  <div key={fare.passengerId} style={{ fontSize: '12px', marginTop: '2px' }}>
                    Passenger {index + 1}: ₹{fare.fare.toFixed(2)} ({fare.distance.toFixed(2)} km)
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RidePlanner;