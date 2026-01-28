// KYC Verification Types for Decentralized Identity

export type VerificationStatus = 
  | 'idle' 
  | 'connecting' 
  | 'encrypting' 
  | 'protecting' 
  | 'computing' 
  | 'verifying' 
  | 'submitting' 
  | 'completed' 
  | 'failed';

export type DocumentType = 
  | 'passport' 
  | 'national_id' 
  | 'driving_license' 
  | 'aadhaar' 
  | 'pan_card';

export interface KYCData {
  documentType: DocumentType;
  documentNumber: string;
  fullName: string;
  dateOfBirth: string;
  nationality: string;
  expiryDate: string;
  documentHash?: string;
}

export interface ProtectedData {
  address: string;
  dataHash: string;
  timestamp: number;
  encryptedData?: string;
}

export interface VerificationResult {
  isValid: boolean;
  timestamp: number;
  proofHash: string;
  enclaveSignature: string;
  attributes: {
    isAdult: boolean;
    isNotExpired: boolean;
    isNotSanctioned: boolean;
  };
}

export interface ZKProof {
  proof: string;
  publicSignals: string[];
  nullifierHash: string;
}

export interface OnChainVerification {
  userAddress: string;
  isVerified: boolean;
  verificationTimestamp: number;
  proofHash: string;
  expiryTimestamp: number;
}

export interface IExecConfig {
  workerpoolAddress: string;
  appAddress: string;
  datasetAddress?: string;
  category: number;
  tag: string;
}

// Network Configuration
export const ARBITRUM_SEPOLIA_CONFIG = {
  chainId: 421614,
  name: 'arbitrum-sepolia-testnet',
  workerpoolAddress: '0xB967057a21dc6A66A29721d96b8Aa7454B7c383F',
  dataProtectorSubgraph: 'https://thegraph.arbitrum-sepolia-testnet.iex.ec/api/subgraphs/id/5YjRPLtjS6GH6bB4yY55Qg4HzwtRGQ8TaHtGf9UBWWd',
  ipfsGateway: 'https://ipfs-gateway.arbitrum-sepolia-testnet.iex.ec',
  ipfsUploadUrl: 'https://ipfs-upload.arbitrum-sepolia-testnet.iex.ec',
  isExperimental: true,
} as const;

export const ARBITRUM_MAINNET_CONFIG = {
  chainId: 42161,
  name: 'arbitrum-mainnet',
  workerpoolAddress: '0x2C06263943180Cc024dAFfeEe15612DB6e5fD248',
  dataProtectorSubgraph: 'https://thegraph.arbitrum.iex.ec/api/subgraphs/id/Ep5zs5zVr4tDiVuQJepUu51e5eWYJpka624X4DMBxe3u',
  ipfsGateway: 'https://ipfs-gateway.arbitrum-mainnet.iex.ec',
  ipfsUploadUrl: 'https://ipfs-upload.arbitrum-mainnet.iex.ec',
  isExperimental: false,
} as const;

export type NetworkConfig = typeof ARBITRUM_SEPOLIA_CONFIG | typeof ARBITRUM_MAINNET_CONFIG;
