import { useEffect, useState } from 'react';
import RoutingService, {
  PursuerDeviationResult,
  PursuerFilterCandidate,
} from '../services/RoutingService';

export function useValidPursuers(
  driverStart: { lat: number; lng: number } | null,
  driverEnd: { lat: number; lng: number } | null,
  pursuers: PursuerFilterCandidate[],
  maxDeviationKm = 10
) {
  const [validPursuers, setValidPursuers] = useState<PursuerDeviationResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!driverStart || !driverEnd || pursuers.length === 0) {
      setValidPursuers([]);
      setError(null);
      return;
    }

    let canceled = false;
    const fetchNearby = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await RoutingService.filterNearbyPursuers({
          driverStart,
          driverEnd,
          pursuers,
          maxDeviationKm,
        });

        if (!canceled) {
          if (!response) {
            setError('Unable to filter nearby pursuers.');
            setValidPursuers([]);
          } else {
            setValidPursuers(response.results.filter((item) => item.valid));
          }
        }
      } catch (err) {
        if (!canceled) {
          setError('Failed to compute nearby pursuers.');
          setValidPursuers([]);
        }
      } finally {
        if (!canceled) {
          setLoading(false);
        }
      }
    };

    fetchNearby();

    return () => {
      canceled = true;
    };
  }, [driverStart, driverEnd, pursuers, maxDeviationKm]);

  return { validPursuers, loading, error };
}
