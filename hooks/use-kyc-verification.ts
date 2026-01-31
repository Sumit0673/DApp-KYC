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
import { logger } from '@/lib/logger';
import { 
  initializeDataProtector, 
  protectKYCData, 
  grantVerificationAccess, 
  executeVerificationTask 
} from '@/lib/services/iexec';

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

export function useKYCVerification(userAddress: string | null, provider?: unknown, chainId?: number) {
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
      
      let verificationResult: VerificationResult;
      
      if (provider) {
        // Check if user is on the correct network (Arbitrum Sepolia)
        const requiredChainId = 421614; // Arbitrum Sepolia
        if (chainId !== requiredChainId) {
          throw new Error(`Please switch to Arbitrum Sepolia testnet (Chain ID: ${requiredChainId}). Current chain: ${chainId}`);
        }
        
        logger.info('Wallet provider available, checking connection', {
          providerType: typeof provider,
          hasRequest: typeof (provider as any)?.request === 'function',
          chainId,
          userAddress
        });
        
        // Test provider connection
        try {
          const testAccounts = await (provider as any).request({ method: 'eth_accounts' });
          logger.info('Provider connection test successful', { accountsCount: testAccounts?.length || 0 });
        } catch (providerError) {
          logger.error('Provider connection test failed', { error: providerError });
          throw new Error('Wallet connection is not working properly. Please reconnect your wallet.');
        }
        
        const dataProtector = await initializeDataProtector(provider, true); // Use testnet
        if (!dataProtector) {
          throw new Error('Failed to initialize iExec DataProtector - check wallet connection and network');
        }
        
        if (!dataProtector.core || typeof dataProtector.core.protectData !== 'function') {
          throw new Error('iExec DataProtector core not properly initialized - API may have changed');
        }
        
        // Protect the KYC data
        logger.info('Protecting KYC data with iExec');
        const protectedKYCData = await protectKYCData(dataProtector, kycData, userAddress);
        
        // Grant access to the iExec app
        logger.info('Granting access to iExec KYC verification app');
        const accessGranted = await grantVerificationAccess(dataProtector, protectedKYCData.address, userAddress);
        if (!accessGranted) {
          throw new Error('Failed to grant access to verification app');
        }
        
        // Execute the verification task
        logger.info('Executing KYC verification task in TEE');
        const iexecResult = await executeVerificationTask(dataProtector, protectedKYCData.address, true);
        verificationResult = iexecResult.result;
        
        logger.info('TEE verification completed', { taskId: iexecResult.taskId, isValid: verificationResult.isValid });
      } else {
        // Fallback to simulation for development
        logger.warn('No wallet provider available, using simulated verification');
        verificationResult = await simulateVerification(kycData, userAddress);
      }
      
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
      logger.error('KYC verification failed', { error: err instanceof Error ? err.message : String(err), stack: err instanceof Error ? err.stack : undefined });
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
