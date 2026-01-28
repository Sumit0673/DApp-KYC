// Zero-Knowledge Proof Service for Privacy-Preserving KYC

import type { KYCData, ZKProof } from '@/lib/types/kyc';
import { hashData, generateNullifierHash } from '@/lib/utils/crypto';

/**
 * ZK Circuit Types for KYC Verification
 * In production, these would be compiled Circom circuits
 */
export type ZKCircuitType = 
  | 'age_verification' 
  | 'nationality_check' 
  | 'document_validity'
  | 'full_kyc';

interface ZKInput {
  privateInputs: Record<string, unknown>;
  publicInputs: Record<string, unknown>;
}

interface ZKVerificationResult {
  isValid: boolean;
  nullifierHash: string;
  publicOutputs: string[];
}

/**
 * Generate age verification ZK proof
 * Proves user is above minimum age without revealing exact birth date
 */
export async function generateAgeVerificationProof(
  dateOfBirth: string,
  minimumAge: number,
  userAddress: string
): Promise<ZKProof> {
  // Calculate age
  const birthDate = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  const isAboveMinimumAge = age >= minimumAge;
  
  // In production, this would use snarkjs to generate a real ZK proof
  // The circuit would prove: birth_date + minimum_age <= current_date
  // without revealing the actual birth_date
  
  const privateWitness = {
    birthYear: birthDate.getFullYear(),
    birthMonth: birthDate.getMonth() + 1,
    birthDay: birthDate.getDate(),
    currentYear: today.getFullYear(),
    currentMonth: today.getMonth() + 1,
    currentDay: today.getDate(),
  };
  
  // Create proof hash (simulated)
  const proofInput = JSON.stringify({
    ...privateWitness,
    minimumAge,
    result: isAboveMinimumAge,
  });
  
  const proofHash = await hashData(proofInput);
  const nullifierHash = await generateNullifierHash(proofHash, userAddress);
  
  return {
    proof: proofHash,
    publicSignals: [
      isAboveMinimumAge ? '1' : '0',
      minimumAge.toString(),
      today.getFullYear().toString(),
    ],
    nullifierHash,
  };
}

/**
 * Generate document validity ZK proof
 * Proves document is valid without revealing document details
 */
export async function generateDocumentValidityProof(
  expiryDate: string,
  documentType: string,
  userAddress: string
): Promise<ZKProof> {
  const expiry = new Date(expiryDate);
  const today = new Date();
  const isValid = expiry > today;
  
  // Calculate days until expiry (without revealing exact date)
  const daysUntilExpiry = Math.floor((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const hasMinimumValidity = daysUntilExpiry > 30; // At least 30 days validity
  
  const proofInput = JSON.stringify({
    documentType,
    expiryYear: expiry.getFullYear(),
    expiryMonth: expiry.getMonth() + 1,
    isValid,
    hasMinimumValidity,
  });
  
  const proofHash = await hashData(proofInput);
  const nullifierHash = await generateNullifierHash(proofHash, userAddress);
  
  return {
    proof: proofHash,
    publicSignals: [
      isValid ? '1' : '0',
      hasMinimumValidity ? '1' : '0',
    ],
    nullifierHash,
  };
}

/**
 * Generate full KYC verification ZK proof
 * Combines age, document validity, and identity verification
 */
export async function generateFullKYCProof(
  kycData: KYCData,
  userAddress: string,
  options: {
    minimumAge?: number;
    allowedNationalities?: string[];
  } = {}
): Promise<ZKProof> {
  const { minimumAge = 18, allowedNationalities } = options;
  
  // Age verification
  const ageProof = await generateAgeVerificationProof(
    kycData.dateOfBirth,
    minimumAge,
    userAddress
  );
  
  // Document validity
  const docProof = await generateDocumentValidityProof(
    kycData.expiryDate,
    kycData.documentType,
    userAddress
  );
  
  // Nationality check (if restrictions provided)
  let nationalityValid = true;
  if (allowedNationalities && allowedNationalities.length > 0) {
    nationalityValid = allowedNationalities.includes(kycData.nationality);
  }
  
  // Combine all proofs
  const combinedInput = JSON.stringify({
    ageProof: ageProof.proof,
    docProof: docProof.proof,
    nationalityValid,
    timestamp: Date.now(),
  });
  
  const combinedProofHash = await hashData(combinedInput);
  const nullifierHash = await generateNullifierHash(
    `${kycData.documentType}:${await hashData(kycData.documentNumber)}`,
    userAddress
  );
  
  // Determine overall validity
  const isAgeValid = ageProof.publicSignals[0] === '1';
  const isDocValid = docProof.publicSignals[0] === '1';
  const isFullyValid = isAgeValid && isDocValid && nationalityValid;
  
  return {
    proof: combinedProofHash,
    publicSignals: [
      isFullyValid ? '1' : '0',           // Overall validity
      isAgeValid ? '1' : '0',             // Age check passed
      isDocValid ? '1' : '0',             // Document valid
      nationalityValid ? '1' : '0',       // Nationality allowed
      minimumAge.toString(),               // Minimum age required
    ],
    nullifierHash,
  };
}

/**
 * Verify a ZK proof (simulated)
 * In production, this would use snarkjs verify
 */
export async function verifyZKProof(
  proof: ZKProof,
  circuitType: ZKCircuitType
): Promise<ZKVerificationResult> {
  // In production, load the verification key for the circuit
  // and use snarkjs.groth16.verify()
  
  // For now, we do basic validation
  const isValidFormat = 
    proof.proof && 
    proof.proof.length === 64 && 
    proof.publicSignals.length > 0;
  
  if (!isValidFormat) {
    return {
      isValid: false,
      nullifierHash: proof.nullifierHash,
      publicOutputs: [],
    };
  }
  
  // Check if the proof indicates success
  const isProofValid = proof.publicSignals[0] === '1';
  
  return {
    isValid: isProofValid,
    nullifierHash: proof.nullifierHash,
    publicOutputs: proof.publicSignals,
  };
}

/**
 * Generate Circom circuit code for age verification
 * This is the actual ZK circuit that would be compiled and used
 */
export function getAgeVerificationCircuit(): string {
  return `pragma circom 2.1.6;

include "circomlib/circuits/comparators.circom";
include "circomlib/circuits/poseidon.circom";

/*
 * Age Verification Circuit
 * Proves: birth_date + minimum_age <= current_date
 * Without revealing: actual birth_date
 */
template AgeVerification() {
    // Private inputs (not revealed)
    signal input birthYear;
    signal input birthMonth;
    signal input birthDay;
    
    // Public inputs
    signal input currentYear;
    signal input currentMonth;
    signal input currentDay;
    signal input minimumAge;
    
    // Output
    signal output isAboveMinimumAge;
    signal output nullifierHash;
    
    // Calculate age
    signal ageYears;
    ageYears <== currentYear - birthYear;
    
    // Check if birthday has passed this year
    component monthCheck = LessThan(8);
    monthCheck.in[0] <== currentMonth;
    monthCheck.in[1] <== birthMonth;
    
    component dayCheck = LessThan(8);
    dayCheck.in[0] <== currentDay;
    dayCheck.in[1] <== birthDay;
    
    signal birthdayNotPassed;
    birthdayNotPassed <== monthCheck.out + (1 - monthCheck.out) * dayCheck.out;
    
    // Actual age (accounting for birthday)
    signal actualAge;
    actualAge <== ageYears - birthdayNotPassed;
    
    // Check if above minimum age
    component ageCheck = GreaterEqThan(8);
    ageCheck.in[0] <== actualAge;
    ageCheck.in[1] <== minimumAge;
    
    isAboveMinimumAge <== ageCheck.out;
    
    // Generate nullifier (for preventing double-verification)
    component hasher = Poseidon(3);
    hasher.inputs[0] <== birthYear;
    hasher.inputs[1] <== birthMonth;
    hasher.inputs[2] <== birthDay;
    
    nullifierHash <== hasher.out;
}

component main {public [currentYear, currentMonth, currentDay, minimumAge]} = AgeVerification();`;
}

/**
 * Get full KYC verification circuit
 */
export function getFullKYCCircuit(): string {
  return `pragma circom 2.1.6;

include "circomlib/circuits/comparators.circom";
include "circomlib/circuits/poseidon.circom";

/*
 * Full KYC Verification Circuit
 * Combines: age, document validity, and identity verification
 */
template FullKYCVerification() {
    // Private inputs
    signal input birthYear;
    signal input birthMonth;
    signal input birthDay;
    signal input documentHash; // Hash of document number
    signal input nameHash;     // Hash of full name
    signal input nationalityCode;
    signal input expiryYear;
    signal input expiryMonth;
    
    // Public inputs
    signal input currentYear;
    signal input currentMonth;
    signal input currentDay;
    signal input minimumAge;
    signal input allowedNationalityHash; // 0 if any nationality allowed
    
    // Outputs
    signal output isFullyVerified;
    signal output nullifierHash;
    
    // --- Age Verification ---
    signal ageYears;
    ageYears <== currentYear - birthYear;
    
    component ageCheck = GreaterEqThan(8);
    ageCheck.in[0] <== ageYears;
    ageCheck.in[1] <== minimumAge;
    
    signal isAdult;
    isAdult <== ageCheck.out;
    
    // --- Document Validity ---
    component yearCheck = GreaterThan(16);
    yearCheck.in[0] <== expiryYear * 100 + expiryMonth;
    yearCheck.in[1] <== currentYear * 100 + currentMonth;
    
    signal isDocumentValid;
    isDocumentValid <== yearCheck.out;
    
    // --- Nationality Check ---
    component natCheck = IsZero();
    natCheck.in <== allowedNationalityHash;
    
    component natMatch = IsEqual();
    natMatch.in[0] <== nationalityCode;
    natMatch.in[1] <== allowedNationalityHash;
    
    signal isNationalityValid;
    isNationalityValid <== natCheck.out + (1 - natCheck.out) * natMatch.out;
    
    // --- Combined Verification ---
    isFullyVerified <== isAdult * isDocumentValid * isNationalityValid;
    
    // --- Generate Nullifier ---
    component nullifier = Poseidon(2);
    nullifier.inputs[0] <== documentHash;
    nullifier.inputs[1] <== nameHash;
    
    nullifierHash <== nullifier.out;
}

component main {public [currentYear, currentMonth, currentDay, minimumAge, allowedNationalityHash]} = FullKYCVerification();`;
}
