// Cryptographic utilities for KYC data protection

import type { KYCData, ZKProof } from '@/lib/types/kyc';

/**
 * Generate a SHA-256 hash of the input data
 */
export async function hashData(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate a unique nullifier hash for ZK proofs
 * This prevents double-verification while maintaining privacy
 */
export async function generateNullifierHash(
  documentHash: string, 
  userAddress: string
): Promise<string> {
  const combined = `${documentHash}:${userAddress}:nullifier`;
  return hashData(combined);
}

/**
 * Create a commitment hash for the KYC data
 * This is what gets stored on-chain (not the actual data)
 */
export async function createCommitment(kycData: KYCData): Promise<string> {
  const dataString = JSON.stringify({
    documentType: kycData.documentType,
    documentNumber: kycData.documentNumber,
    dateOfBirth: kycData.dateOfBirth,
    nationality: kycData.nationality,
  });
  return hashData(dataString);
}

/**
 * Simulate ZK proof generation for age verification
 * In production, this would use a ZK circuit (snarkjs/circom)
 */
export async function generateAgeProof(
  dateOfBirth: string,
  minimumAge: number = 18
): Promise<ZKProof> {
  const birthDate = new Date(dateOfBirth);
  const today = new Date();
  const age = today.getFullYear() - birthDate.getFullYear();
  
  // Simulated proof - in production, use snarkjs with a proper circuit
  const proofInput = `${dateOfBirth}:${minimumAge}:${age >= minimumAge}`;
  const proofHash = await hashData(proofInput);
  const nullifierHash = await hashData(`${proofHash}:nullifier`);
  
  return {
    proof: proofHash,
    publicSignals: [
      age >= minimumAge ? '1' : '0', // isAdult signal
      minimumAge.toString(),
    ],
    nullifierHash,
  };
}

/**
 * Verify a document hasn't expired
 */
export function isDocumentValid(expiryDate: string): boolean {
  const expiry = new Date(expiryDate);
  const today = new Date();
  return expiry > today;
}

/**
 * Check if user is of legal age
 */
export function isAdult(dateOfBirth: string, minimumAge: number = 18): boolean {
  const birthDate = new Date(dateOfBirth);
  const today = new Date();
  const age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    return age - 1 >= minimumAge;
  }
  return age >= minimumAge;
}

/**
 * Encrypt data for TEE processing (simplified - use proper encryption in production)
 */
export async function encryptForTEE(data: KYCData): Promise<string> {
  const jsonData = JSON.stringify(data);
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(jsonData);
  
  // Generate a random key for this session
  const key = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
  
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    dataBuffer
  );
  
  // Combine IV and encrypted data
  const combined = new Uint8Array(iv.length + encryptedBuffer.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encryptedBuffer), iv.length);
  
  return btoa(String.fromCharCode(...combined));
}

/**
 * Generate a random salt for hashing
 */
export function generateSalt(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
}
