import { RidePassenger, RidePricingConfig, VehicleType } from './models/Ride.js';

// Delhi main campus gate (IIT Delhi) coordinates
const DEFAULT_CAMPUS_CENTER = { lat: 28.5450, lng: 77.1926 };

export const DEFAULT_PRICING_CONFIG: RidePricingConfig = {
  vehicleType: '4-wheeler',
  basePickupFee: 10,
  perKmRate: 4,
  platformFeePercent: 0,
  platformFeeCap: 15,
  emptySeatIncentivePassengers: 3,
  emptySeatDiscount: 0.15,
  campusZoneRadius: 2,
  campusZoneCenter: DEFAULT_CAMPUS_CENTER,
  campusZoneFlatRates: { bike: 20, car: 35 },
};

const roundMoney = (value: number) => Math.round(value * 100) / 100;

/**
 * Calculate distance between two coordinates using Haversine formula (in kilometers)
 */
const haversineDistance = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export class PricingService {
  static getConfig(config?: RidePricingConfig): RidePricingConfig {
    const mergedConfig = {
      ...DEFAULT_PRICING_CONFIG,
      ...(config || {}),
    };
    return mergedConfig;
  }

  /**
   * Check if a ride origin/destination is within campus zone
   */
  static isInCampusZone(
    lat: number,
    lng: number,
    campusCenter?: { lat: number; lng: number },
    radius: number = 2
  ): boolean {
    const center = campusCenter || DEFAULT_CAMPUS_CENTER;
    const distance = haversineDistance(lat, lng, center.lat, center.lng);
    return distance <= radius;
  }

  /**
   * Apply campus zone flat-rate pricing if applicable
   */
  static applyCampusZoneFlatRate(
    origin: { lat: number; lng: number },
    destination: { lat: number; lng: number },
    vehicleType: VehicleType,
    campusCenter?: { lat: number; lng: number },
    flatRates?: { bike: number; car: number }
  ): number | null {
    const rates = flatRates || { bike: 20, car: 35 };
    const center = campusCenter || DEFAULT_CAMPUS_CENTER;
    const radius = 2;

    const originInZone = this.isInCampusZone(origin.lat, origin.lng, center, radius);
    const destInZone = this.isInCampusZone(destination.lat, destination.lng, center, radius);

    if (originInZone && destInZone) {
      return vehicleType === '2-wheeler' ? rates.bike : rates.car;
    }

    return null;
  }

  /**
   * Calculate base fare before any discounts or platform fees
   * Formula: BaseFee + (Distance × Rate)
   */
  static calculateBaseFare(params: {
    distance?: number;
    vehicleType?: VehicleType;
    pricingConfig?: RidePricingConfig;
    explicitBaseFare?: number;
  }): number {
    const config = this.getConfig(params.pricingConfig);
    const distance = params.distance || 0;
    const vehicleType = params.vehicleType || config.vehicleType;

    // If explicit base fare is provided, use it
    if (typeof params.explicitBaseFare === 'number' && params.explicitBaseFare > 0) {
      return roundMoney(params.explicitBaseFare);
    }

    // Formula: BaseFee + (Distance × Rate)
    const baseFareCalculated = config.basePickupFee + distance * config.perKmRate;
    return roundMoney(baseFareCalculated);
  }

  /**
   * Apply empty seat incentive (15% discount if 3+ passengers)
   */
  static applyEmptySeatIncentive(
    baseFare: number,
    passengerCount: number,
    pricingConfig?: RidePricingConfig
  ): { fare: number; discountApplied: boolean } {
    const config = this.getConfig(pricingConfig);

    if (passengerCount >= config.emptySeatIncentivePassengers) {
      const discountedFare = baseFare * (1 - config.emptySeatDiscount);
      return {
        fare: roundMoney(discountedFare),
        discountApplied: true,
      };
    }

    return {
      fare: baseFare,
      discountApplied: false,
    };
  }

  /**
   * Apply platform service fee
   * Formula: fare × (1 + PlatformFee%), capped at ₹15
   */
  static applyPlatformFee(fare: number, pricingConfig?: RidePricingConfig): number {
    const config = this.getConfig(pricingConfig);
    const feeAmount = fare * config.platformFeePercent;
    const cappedFee = Math.min(feeAmount, config.platformFeeCap);
    return roundMoney(fare + cappedFee);
  }

  /**
   * Calculate final fare using the complete formula:
   * F = (BaseFee + (Distance × Rate)) × (1 + PlatformFee%)
   * With campus zone flat-rates and empty seat incentive applied
   */
  static calculateFinalFare(params: {
    distance?: number;
    vehicleType?: VehicleType;
    passengerCount?: number;
    origin?: { lat: number; lng: number };
    destination?: { lat: number; lng: number };
    pricingConfig?: RidePricingConfig;
  }): {
    baseFare: number;
    afterDiscount: number;
    platformFee: number;
    finalFare: number;
    campusZoneApplied: boolean;
    emptySeatApplied: boolean;
  } {
    const config = this.getConfig(params.pricingConfig);
    const vehicleType = params.vehicleType || config.vehicleType;
    const distance = params.distance || 0;
    const passengerCount = params.passengerCount || 1;

    let baseFare = this.calculateBaseFare({
      distance,
      vehicleType,
      pricingConfig: config,
    });

    let campusZoneApplied = false;
    let emptySeatApplied = false;

    // Check for campus zone flat-rate
    if (params.origin && params.destination) {
      const flatRate = this.applyCampusZoneFlatRate(
        params.origin,
        params.destination,
        vehicleType,
        config.campusZoneCenter,
        config.campusZoneFlatRates
      );

      if (flatRate !== null) {
        baseFare = flatRate;
        campusZoneApplied = true;
      }
    }

    // Apply empty seat incentive
    const afterDiscount = campusZoneApplied
      ? baseFare
      : this.applyEmptySeatIncentive(baseFare, passengerCount, config).fare;

    if (campusZoneApplied === false && passengerCount >= config.emptySeatIncentivePassengers) {
      emptySeatApplied = true;
    }

    // Apply platform fee
    const platformFee = this.applyPlatformFee(afterDiscount, config) - afterDiscount;
    const finalFare = roundMoney(afterDiscount + platformFee);

    return {
      baseFare: roundMoney(baseFare),
      afterDiscount: roundMoney(afterDiscount),
      platformFee: roundMoney(platformFee),
      finalFare,
      campusZoneApplied,
      emptySeatApplied,
    };
  }

  static applyProgressiveDiscounts(passengers: RidePassenger[], pricingConfig?: RidePricingConfig): RidePassenger[] {
    const config = this.getConfig(pricingConfig);
    const updatedPassengers = [...passengers].sort((a, b) =>
      new Date(a.joinedAt).getTime() - new Date(b.joinedAt).getTime()
    );

    for (let i = 0; i < updatedPassengers.length; i += 1) {
      const passenger = updatedPassengers[i];
      const laterBookingsCount = updatedPassengers.length - i - 1;
      const discountPercent = Math.min(
        config.discountCap || 0.45,
        (config.discountStep || 0.15) * laterBookingsCount
      );

      const rawFinalFare = passenger.baseFare * (1 - discountPercent);
      const finalFare = roundMoney(Math.max(config.minFare || 20, rawFinalFare));
      const discountAmount = roundMoney(Math.max(0, passenger.baseFare - finalFare));

      updatedPassengers[i] = {
        ...passenger,
        discountPercent: roundMoney(discountPercent),
        discountAmount,
        finalFare,
      };
    }

    // Fairness floor: a later rider must not get a better discount ratio than an earlier rider.
    for (let i = 1; i < updatedPassengers.length; i += 1) {
      const previous = updatedPassengers[i - 1];
      const current = updatedPassengers[i];

      const previousRatio = previous.finalFare / previous.baseFare;
      const currentRatio = current.finalFare / current.baseFare;

      if (currentRatio < previousRatio) {
        const adjustedFinalFare = roundMoney(Math.max(config.minFare || 20, current.baseFare * previousRatio));
        const adjustedDiscountAmount = roundMoney(Math.max(0, current.baseFare - adjustedFinalFare));
        const adjustedDiscountPercent = roundMoney(
          Math.min(config.discountCap || 0.45, Math.max(0, adjustedDiscountAmount / current.baseFare))
        );

        updatedPassengers[i] = {
          ...current,
          finalFare: adjustedFinalFare,
          discountAmount: adjustedDiscountAmount,
          discountPercent: adjustedDiscountPercent,
        };
      }
    }

    return updatedPassengers;
  }
}
