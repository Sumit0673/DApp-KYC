'use client';

import { useState, useCallback } from 'react';
import type { 
  KYCData, 
  VerificationStatus, 
  VerificationResult,
  ZKProof,
  ProtectedData 
} from '@/lib/types/kyc';
import { simulateVerification } from '@/lib/services/iexec';
import { generateFullKYCProof, verifyZKProof } from '@/lib/services/zkproof';
import { generateMockTransactionHash } from '@/lib/services/contract';
import { encryptForTEE, createCommitment } from '@/lib/utils/crypto';

export interface KYCVerificationState {
  status: VerificationStatus;
  currentStep: number;
  totalSteps: number;
  protectedData: ProtectedData | null;
  zkProof: ZKProof | null;
  verificationResult: VerificationResult | null;
  transactionHash: string | null;
  error: string | null;
}

const VERIFICATION_STEPS = [
  'Connect Wallet',
  'Submit Identity',
  'Encrypt Data',
  'Generate ZK Proof',
  'TEE Verification',
  'Submit On-Chain',
  'Complete',
];

export function useKYCVerification(userAddress: string | null) {
  const [state, setState] = useState<KYCVerificationState>({
    status: 'idle',
    currentStep: 0,
    totalSteps: VERIFICATION_STEPS.length,
    protectedData: null,
    zkProof: null,
    verificationResult: null,
    transactionHash: null,
    error: null,
  });

  const updateState = (updates: Partial<KYCVerificationState>) => {
    setState(prev => ({ ...prev, ...updates }));
  };

  const reset = useCallback(() => {
    setState({
      status: 'idle',
      currentStep: 0,
      totalSteps: VERIFICATION_STEPS.length,
      protectedData: null,
      zkProof: null,
      verificationResult: null,
      transactionHash: null,
      error: null,
    });
  }, []);

  const startVerification = useCallback(async (kycData: KYCData) => {
    if (!userAddress) {
      updateState({ error: 'Please connect your wallet first', status: 'failed' });
      return;
    }

    try {
      // Step 1: Encrypting data
      updateState({ status: 'encrypting', currentStep: 2 });
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const encryptedData = await encryptForTEE(kycData);
      const dataHash = await createCommitment(kycData);
      
      const protectedData: ProtectedData = {
        address: userAddress,
        dataHash,
        timestamp: Date.now(),
        encryptedData,
      };
      
      updateState({ protectedData });

      // Step 2: Generate ZK Proof
      updateState({ status: 'computing', currentStep: 3 });
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const zkProof = await generateFullKYCProof(kycData, userAddress, {
        minimumAge: 18,
      });
      
      // Verify the ZK proof locally
      const zkVerification = await verifyZKProof(zkProof, 'full_kyc');
      
      if (!zkVerification.isValid) {
        updateState({ 
          error: 'ZK proof verification failed. Please check your information.',
          status: 'failed' 
        });
        return;
      }
      
      updateState({ zkProof });

      // Step 3: TEE Verification (iExec)
      updateState({ status: 'verifying', currentStep: 4 });
      
      // In production, this would use the actual iExec DataProtector
      // For now, we simulate the TEE verification
      const verificationResult = await simulateVerification(kycData, userAddress);
      
      if (!verificationResult.isValid) {
        updateState({ 
          error: 'Identity verification failed. Please ensure your documents are valid.',
          status: 'failed',
          verificationResult 
        });
        return;
      }
      
      updateState({ verificationResult });

      // Step 4: Submit to blockchain
      updateState({ status: 'submitting', currentStep: 5 });
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // In production, this would submit to the actual smart contract
      const txHash = await generateMockTransactionHash();
      
      updateState({ 
        transactionHash: txHash,
        status: 'completed',
        currentStep: 6 
      });

    } catch (err) {
      console.error('[v0] Verification failed:', err);
      updateState({ 
        error: err instanceof Error ? err.message : 'Verification failed. Please try again.',
        status: 'failed' 
      });
    }
  }, [userAddress]);

  return {
    ...state,
    steps: VERIFICATION_STEPS,
    startVerification,
    reset,
  };
}
