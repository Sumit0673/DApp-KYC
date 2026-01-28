// iExec DataProtector Service for Confidential KYC

import type { 
  KYCData, 
  ProtectedData, 
  VerificationResult,
  NetworkConfig 
} from '@/lib/types/kyc';
import { 
  ARBITRUM_SEPOLIA_CONFIG, 
  ARBITRUM_MAINNET_CONFIG 
} from '@/lib/types/kyc';
import { hashData, createCommitment, isDocumentValid, isAdult } from '@/lib/utils/crypto';

// iExec App address - this should be deployed via iapp deploy
const IEXEC_KYC_APP_ADDRESS = process.env.NEXT_PUBLIC_IEXEC_APP_ADDRESS || '0x0000000000000000000000000000000000000000';

export interface IExecDataProtector {
  protectData: (data: Record<string, unknown>) => Promise<{ address: string }>;
  grantAccess: (params: {
    protectedData: string;
    authorizedApp: string;
    authorizedUser: string;
  }) => Promise<{ grantedAccess: unknown }>;
  processProtectedData: (params: {
    protectedData: string;
    app: string;
    workerpool: string;
  }) => Promise<{ result: string }>;
}

export interface IExecResult {
  taskId: string;
  result: VerificationResult;
}

/**
 * Get network configuration based on chain ID
 */
export function getNetworkConfig(chainId: number): NetworkConfig {
  if (chainId === 42161) {
    return ARBITRUM_MAINNET_CONFIG;
  }
  return ARBITRUM_SEPOLIA_CONFIG;
}

/**
 * Initialize the iExec DataProtector SDK
 * Note: This requires the @iexec/dataprotector package
 */
export async function initializeDataProtector(
  provider: unknown,
  isTestnet: boolean = true
): Promise<IExecDataProtector | null> {
  try {
    // Dynamic import to handle SSR
    const { IExecDataProtector } = await import('@iexec/dataprotector');
    
    const dataProtector = new IExecDataProtector(provider, {
      // Enable experimental networks for Arbitrum support
      allowExperimentalNetworks: isTestnet,
    });
    
    return dataProtector;
  } catch (error) {
    console.error('[v0] Failed to initialize DataProtector:', error);
    return null;
  }
}

/**
 * Protect KYC data using iExec DataProtector
 * Data is encrypted and stored securely, only accessible in TEE
 */
export async function protectKYCData(
  dataProtector: IExecDataProtector,
  kycData: KYCData,
  userAddress: string
): Promise<ProtectedData> {
  // Create a structured data object for protection
  const dataToProtect = {
    documentType: kycData.documentType,
    documentHash: await hashData(kycData.documentNumber),
    nameHash: await hashData(kycData.fullName.toLowerCase()),
    dateOfBirth: kycData.dateOfBirth,
    nationality: kycData.nationality,
    expiryDate: kycData.expiryDate,
    timestamp: Date.now(),
  };
  
  const result = await dataProtector.protectData(dataToProtect);
  
  return {
    address: result.address,
    dataHash: await createCommitment(kycData),
    timestamp: Date.now(),
  };
}

/**
 * Grant access to the KYC verification app to process protected data
 */
export async function grantVerificationAccess(
  dataProtector: IExecDataProtector,
  protectedDataAddress: string,
  userAddress: string
): Promise<boolean> {
  try {
    const networkConfig = ARBITRUM_SEPOLIA_CONFIG;
    
    await dataProtector.grantAccess({
      protectedData: protectedDataAddress,
      authorizedApp: IEXEC_KYC_APP_ADDRESS,
      authorizedUser: userAddress,
    });
    
    console.log('[v0] Access granted for KYC verification');
    return true;
  } catch (error) {
    console.error('[v0] Failed to grant access:', error);
    return false;
  }
}

/**
 * Execute the KYC verification task in TEE
 */
export async function executeVerificationTask(
  dataProtector: IExecDataProtector,
  protectedDataAddress: string,
  isTestnet: boolean = true
): Promise<IExecResult> {
  const networkConfig = isTestnet ? ARBITRUM_SEPOLIA_CONFIG : ARBITRUM_MAINNET_CONFIG;
  
  try {
    const taskResult = await dataProtector.processProtectedData({
      protectedData: protectedDataAddress,
      app: IEXEC_KYC_APP_ADDRESS,
      workerpool: networkConfig.workerpoolAddress,
    });
    
    // Parse the result from the TEE computation
    const verificationResult: VerificationResult = JSON.parse(taskResult.result);
    
    return {
      taskId: protectedDataAddress,
      result: verificationResult,
    };
  } catch (error) {
    console.error('[v0] TEE verification failed:', error);
    throw error;
  }
}

/**
 * Simulate verification for development/testing
 * This mimics what would happen inside the TEE
 */
export async function simulateVerification(
  kycData: KYCData,
  userAddress: string
): Promise<VerificationResult> {
  // Simulate processing delay
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  const isValidDocument = isDocumentValid(kycData.expiryDate);
  const isUserAdult = isAdult(kycData.dateOfBirth);
  const isNotSanctioned = true; // Would check sanctions list in production
  
  const isValid = isValidDocument && isUserAdult && isNotSanctioned;
  
  const proofData = `${userAddress}:${kycData.documentType}:${isValid}:${Date.now()}`;
  const proofHash = await hashData(proofData);
  
  // Simulated enclave signature
  const enclaveSignature = await hashData(`${proofHash}:enclave:signature`);
  
  return {
    isValid,
    timestamp: Date.now(),
    proofHash,
    enclaveSignature,
    attributes: {
      isAdult: isUserAdult,
      isNotExpired: isValidDocument,
      isNotSanctioned,
    },
  };
}

/**
 * Fetch verification status from the subgraph
 */
export async function fetchVerificationStatus(
  userAddress: string,
  isTestnet: boolean = true
): Promise<boolean | null> {
  const networkConfig = isTestnet ? ARBITRUM_SEPOLIA_CONFIG : ARBITRUM_MAINNET_CONFIG;
  
  const query = `
    query GetVerificationStatus($address: String!) {
      verifications(where: { userAddress: $address }) {
        isVerified
        timestamp
        proofHash
      }
    }
  `;
  
  try {
    const response = await fetch(networkConfig.dataProtectorSubgraph, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        variables: { address: userAddress.toLowerCase() },
      }),
    });
    
    const data = await response.json();
    
    if (data.data?.verifications?.length > 0) {
      return data.data.verifications[0].isVerified;
    }
    
    return null;
  } catch (error) {
    console.error('[v0] Failed to fetch verification status:', error);
    return null;
  }
}
