export type VerificationStatus = 'unverified' | 'pending' | 'verified' | 'rejected';

export interface RiderVerification {
  studentIdNumber?: string;
  licenseNumber?: string;
  vehicleRegNumber?: string;
  universityEmailVerified?: boolean;
  submittedAt?: string;
  reviewedAt?: string;
  reviewerNote?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  university: string;
  phone: string;
  password?: string; // Optional on the frontend for security, but needed for login/signup
  schedule: string[]; // Array of strings representing availability
  verificationStatus?: VerificationStatus;
  verification?: RiderVerification;
}
