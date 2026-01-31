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
import { logger } from '@/lib/logger';

// iExec App address - this should be deployed via iapp deploy
const IEXEC_KYC_APP_ADDRESS = process.env.NEXT_PUBLIC_IEXEC_APP_ADDRESS || '0x0000000000000000000000000000000000000000';

export type IExecDataProtectorInstance = any;

export interface IExecResult {
  taskId: string;
  result: VerificationResult;
}

/**
 * Get network configuration based on chain ID
 */
export function getNetworkConfig(chainId: number): NetworkConfig {
  if (chainId === 421614) {
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
): Promise<IExecDataProtectorInstance | null> {
  try {
    logger.info('Initializing iExec DataProtector', { 
      isTestnet, 
      hasProvider: !!provider,
      providerType: typeof provider
    });
    
    // Check if provider has required methods
    const providerObj = provider as any;
    if (providerObj && typeof providerObj.request !== 'function') {
      throw new Error('Provider does not have request method');
    }
    
    // Test provider connection
    try {
      const accounts = await providerObj.request({ method: 'eth_accounts' });
      logger.info('Provider connection test successful', { accountsCount: accounts?.length || 0 });
      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts available - wallet not connected');
      }
    } catch (providerError) {
      logger.error('Provider connection test failed', { error: providerError });
      throw new Error('Wallet connection is not working properly');
    }
    
    // Dynamic import to handle SSR
    const { IExecDataProtector } = await import('@iexec/dataprotector');
    logger.debug('IExecDataProtector imported successfully');
    
    const dataProtector = new IExecDataProtector(provider as any, {
      // Enable experimental networks for Arbitrum support
      allowExperimentalNetworks: isTestnet,
    });
    logger.debug('IExecDataProtector instance created');
    
    // Check if the instance has the expected structure
    if (!dataProtector) {
      throw new Error('DataProtector instance is null');
    }
    if (!dataProtector.core) {
      throw new Error('DataProtector core is not available');
    }
    if (typeof dataProtector.core.protectData !== 'function') {
      throw new Error('DataProtector protectData method is not available');
    }
    
    logger.info('iExec DataProtector initialized successfully', { 
      hasCore: !!dataProtector.core,
      hasSharing: !!dataProtector.sharing,
      coreMethods: Object.getOwnPropertyNames(dataProtector.core)
    });
    
    return dataProtector;
  } catch (error) {
    logger.error('Failed to initialize DataProtector', { 
      error: error instanceof Error ? error.message : String(error),
      isTestnet,
      hasProvider: !!provider,
      stack: error instanceof Error ? error.stack : undefined
    });
    return null;
  }
}

/**
 * Protect KYC data using iExec DataProtector
 * Data is encrypted and stored securely, only accessible in TEE
 */
export async function protectKYCData(
  dataProtector: IExecDataProtectorInstance,
  kycData: KYCData,
  userAddress: string
): Promise<ProtectedData> {
  try {
    logger.info('Starting KYC data protection', { userAddress, documentType: kycData.documentType });
    
    // Validate input data
    if (!kycData.documentType || !kycData.documentNumber || !kycData.fullName || 
        !kycData.dateOfBirth || !kycData.nationality || !kycData.expiryDate) {
      throw new Error('Missing required KYC data fields');
    }

    // Generate hashes first (these are async)
    logger.debug('Generating document hash', { documentNumber: kycData.documentNumber });
    const documentHash = await hashData(String(kycData.documentNumber));
    logger.debug('Document hash generated', { documentHash: documentHash.substring(0, 10) + '...' });
    
    logger.debug('Generating name hash', { fullName: kycData.fullName });
    const nameHash = await hashData(String(kycData.fullName).toLowerCase());
    logger.debug('Name hash generated', { nameHash: nameHash.substring(0, 10) + '...' });
    
    // Create a structured data object for protection
    // iExec supports: strings, numbers, booleans, arrays of these types
    // Use very simple data to test
    const dataToProtect = {
      type: 'kyc',
      user: userAddress,
      doc: kycData.documentType,
    };
    
    // Validate that all values are defined and not empty
    for (const [key, value] of Object.entries(dataToProtect)) {
      if (value === undefined || value === null || value === '') {
        throw new Error(`Invalid data for field ${key}: ${value}`);
      }
      if (typeof value !== 'string') {
        throw new Error(`Invalid data type for field ${key}: expected string, got ${typeof value}`);
      }
    }
    
    logger.debug('Calling dataProtector.core.protectData', { 
      dataKeys: Object.keys(dataToProtect),
      dataTypes: Object.fromEntries(Object.entries(dataToProtect).map(([k, v]) => [k, typeof v])),
      dataValues: Object.fromEntries(Object.entries(dataToProtect).map(([k, v]) => [k, String(v).substring(0, 20) + '...']))
    });
    
    // Final validation - ensure no undefined values in JSON
    const jsonData = JSON.stringify(dataToProtect);
    if (jsonData.includes('undefined')) {
      throw new Error('JSON contains undefined values');
    }
    logger.debug('Data to protect JSON', { jsonData, length: jsonData.length });
    
    // Parse back to ensure it's valid JSON
    const validatedData = JSON.parse(jsonData);
    logger.debug('Validated data for iExec', { validatedData });
    
    const result = await dataProtector.core.protectData({
      data: validatedData,
      name: `KYC Data for ${userAddress.slice(0, 6)}...${userAddress.slice(-4)}`
    });
    
    const protectedData = {
      address: result.address,
      dataHash: await createCommitment(kycData),
      timestamp: Date.now(),
    };
    
    logger.info('KYC data protection completed', { protectedDataAddress: result.address });
    return protectedData;
  } catch (error) {
    logger.error('KYC data protection failed', { 
      error: error instanceof Error ? error.message : String(error),
      userAddress,
      documentType: kycData.documentType,
      kycData: JSON.stringify(kycData, null, 2)
    });
    throw error;
  }
}

/**
 * Grant access to the KYC verification app to process protected data
 */
export async function grantVerificationAccess(
  dataProtector: IExecDataProtectorInstance,
  protectedDataAddress: string,
  userAddress: string
): Promise<boolean> {
  try {
    const networkConfig = ARBITRUM_SEPOLIA_CONFIG;
    
    await dataProtector.core.grantAccess({
      protectedData: protectedDataAddress,
      authorizedApp: IEXEC_KYC_APP_ADDRESS,
      authorizedUser: userAddress,
    });
    
    logger.info('Access granted for KYC verification', { protectedData: protectedDataAddress, app: IEXEC_KYC_APP_ADDRESS, user: userAddress });
    return true;
  } catch (error) {
    logger.error('Failed to grant access', { 
      error: error instanceof Error ? error.message : String(error),
      protectedData: protectedDataAddress,
      app: IEXEC_KYC_APP_ADDRESS,
      user: userAddress
    });
    return false;
  }
}

/**
 * Execute the KYC verification task in TEE
 */
export async function executeVerificationTask(
  dataProtector: IExecDataProtectorInstance,
  protectedDataAddress: string,
  isTestnet: boolean = true
): Promise<IExecResult> {
  const networkConfig = isTestnet ? ARBITRUM_SEPOLIA_CONFIG : ARBITRUM_MAINNET_CONFIG;
  
  try {
    logger.info('Starting TEE verification task', { 
      protectedData: protectedDataAddress,
      app: IEXEC_KYC_APP_ADDRESS,
      workerpool: networkConfig.workerpoolAddress,
      isTestnet
    });
    
    const taskResult = await dataProtector.core.processProtectedData({
      protectedData: protectedDataAddress,
      app: IEXEC_KYC_APP_ADDRESS,
      workerpool: networkConfig.workerpoolAddress,
    });
    
    // Parse the result from the TEE computation
    const verificationResult: VerificationResult = JSON.parse(taskResult.result);
    
    logger.info('TEE verification completed', { 
      taskId: protectedDataAddress,
      isValid: verificationResult.isValid,
      result: verificationResult
    });
    
    return {
      taskId: protectedDataAddress,
      result: verificationResult,
    };
  } catch (error) {
    logger.error('TEE verification failed', { 
      error: error instanceof Error ? error.message : String(error),
      protectedData: protectedDataAddress,
      app: IEXEC_KYC_APP_ADDRESS,
      workerpool: networkConfig.workerpoolAddress
    });
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
    logger.error('Failed to fetch verification status', { 
      error: error instanceof Error ? error.message : String(error),
      userAddress,
      subgraph: networkConfig.dataProtectorSubgraph
    });
    return null;
  }
}
