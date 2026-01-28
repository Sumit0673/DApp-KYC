// Smart Contract Interaction Layer for KYC Verifier

import type { VerificationResult, OnChainVerification } from '@/lib/types/kyc';
import { hashData } from '@/lib/utils/crypto';

// KYC Verifier Contract ABI (simplified)
export const KYC_VERIFIER_ABI = [
  {
    name: 'submitProof',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'user', type: 'address' },
      { name: 'result', type: 'bool' },
      { name: 'proofHash', type: 'bytes32' },
      { name: 'enclaveSignature', type: 'bytes' },
      { name: 'expiryTimestamp', type: 'uint256' },
    ],
    outputs: [],
  },
  {
    name: 'isVerified',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [{ name: '', type: 'bool' }],
  },
  {
    name: 'getVerification',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [
      { name: 'isVerified', type: 'bool' },
      { name: 'verificationTimestamp', type: 'uint256' },
      { name: 'proofHash', type: 'bytes32' },
      { name: 'expiryTimestamp', type: 'uint256' },
    ],
  },
  {
    name: 'revokeVerification',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [{ name: 'user', type: 'address' }],
    outputs: [],
  },
  {
    name: 'Verified',
    type: 'event',
    inputs: [
      { name: 'user', type: 'address', indexed: true },
      { name: 'proofHash', type: 'bytes32', indexed: false },
      { name: 'timestamp', type: 'uint256', indexed: false },
    ],
  },
] as const;

// Contract address - should be deployed on Arbitrum
const KYC_VERIFIER_ADDRESS = process.env.NEXT_PUBLIC_KYC_VERIFIER_ADDRESS || '0x0000000000000000000000000000000000000000';

// Verification validity period (1 year in seconds)
const VERIFICATION_VALIDITY_PERIOD = 365 * 24 * 60 * 60;

/**
 * Submit verification proof to the smart contract
 */
export async function submitVerificationProof(
  walletClient: unknown,
  publicClient: unknown,
  userAddress: `0x${string}`,
  verificationResult: VerificationResult
): Promise<{ hash: string; success: boolean }> {
  try {
    // Convert proof hash to bytes32
    const proofHashBytes = `0x${verificationResult.proofHash}` as `0x${string}`;
    
    // Convert enclave signature to bytes
    const signatureBytes = `0x${verificationResult.enclaveSignature}` as `0x${string}`;
    
    // Calculate expiry timestamp (1 year from now)
    const expiryTimestamp = BigInt(Math.floor(Date.now() / 1000) + VERIFICATION_VALIDITY_PERIOD);
    
    // @ts-expect-error - Dynamic wallet client
    const hash = await walletClient.writeContract({
      address: KYC_VERIFIER_ADDRESS as `0x${string}`,
      abi: KYC_VERIFIER_ABI,
      functionName: 'submitProof',
      args: [
        userAddress,
        verificationResult.isValid,
        proofHashBytes,
        signatureBytes,
        expiryTimestamp,
      ],
    });
    
    // Wait for transaction confirmation
    // @ts-expect-error - Dynamic public client
    await publicClient.waitForTransactionReceipt({ hash });
    
    return { hash, success: true };
  } catch (error) {
    console.error('[v0] Failed to submit verification proof:', error);
    return { hash: '', success: false };
  }
}

/**
 * Check if a user is verified on-chain
 */
export async function checkOnChainVerification(
  publicClient: unknown,
  userAddress: `0x${string}`
): Promise<boolean> {
  try {
    // @ts-expect-error - Dynamic public client
    const isVerified = await publicClient.readContract({
      address: KYC_VERIFIER_ADDRESS as `0x${string}`,
      abi: KYC_VERIFIER_ABI,
      functionName: 'isVerified',
      args: [userAddress],
    });
    
    return isVerified as boolean;
  } catch (error) {
    console.error('[v0] Failed to check verification status:', error);
    return false;
  }
}

/**
 * Get full verification details from the contract
 */
export async function getVerificationDetails(
  publicClient: unknown,
  userAddress: `0x${string}`
): Promise<OnChainVerification | null> {
  try {
    // @ts-expect-error - Dynamic public client
    const result = await publicClient.readContract({
      address: KYC_VERIFIER_ADDRESS as `0x${string}`,
      abi: KYC_VERIFIER_ABI,
      functionName: 'getVerification',
      args: [userAddress],
    });
    
    const [isVerified, verificationTimestamp, proofHash, expiryTimestamp] = result as [
      boolean,
      bigint,
      string,
      bigint
    ];
    
    return {
      userAddress,
      isVerified,
      verificationTimestamp: Number(verificationTimestamp),
      proofHash,
      expiryTimestamp: Number(expiryTimestamp),
    };
  } catch (error) {
    console.error('[v0] Failed to get verification details:', error);
    return null;
  }
}

/**
 * Generate the Solidity contract code for deployment
 */
export function generateContractCode(): string {
  return `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/**
 * @title KYCVerifier
 * @notice Decentralized KYC verification contract using iExec TEE attestations
 * @dev Stores verification results without any PII
 */
contract KYCVerifier is Ownable {
    using ECDSA for bytes32;

    struct Verification {
        bool isVerified;
        uint256 verificationTimestamp;
        bytes32 proofHash;
        uint256 expiryTimestamp;
    }

    // Mapping of user address to verification status
    mapping(address => Verification) public verifications;
    
    // Trusted enclave signer address (from iExec TEE)
    address public trustedEnclave;
    
    // Events
    event Verified(address indexed user, bytes32 proofHash, uint256 timestamp);
    event Revoked(address indexed user, uint256 timestamp);
    event EnclaveUpdated(address indexed oldEnclave, address indexed newEnclave);

    constructor(address _trustedEnclave) Ownable(msg.sender) {
        trustedEnclave = _trustedEnclave;
    }

    /**
     * @notice Submit a verification proof from the TEE
     * @param user The user address being verified
     * @param result The verification result (true/false)
     * @param proofHash Hash of the verification proof
     * @param enclaveSignature Signature from the trusted enclave
     * @param expiryTimestamp When the verification expires
     */
    function submitProof(
        address user,
        bool result,
        bytes32 proofHash,
        bytes calldata enclaveSignature,
        uint256 expiryTimestamp
    ) external {
        // Verify the enclave signature
        bytes32 messageHash = keccak256(abi.encodePacked(user, result, proofHash, expiryTimestamp));
        bytes32 ethSignedHash = messageHash.toEthSignedMessageHash();
        address signer = ethSignedHash.recover(enclaveSignature);
        
        require(signer == trustedEnclave, "Invalid enclave signature");
        require(result == true, "Verification failed");
        require(expiryTimestamp > block.timestamp, "Proof already expired");

        verifications[user] = Verification({
            isVerified: true,
            verificationTimestamp: block.timestamp,
            proofHash: proofHash,
            expiryTimestamp: expiryTimestamp
        });

        emit Verified(user, proofHash, block.timestamp);
    }

    /**
     * @notice Check if a user is verified
     * @param user The user address to check
     * @return True if verified and not expired
     */
    function isVerified(address user) external view returns (bool) {
        Verification memory v = verifications[user];
        return v.isVerified && v.expiryTimestamp > block.timestamp;
    }

    /**
     * @notice Get full verification details
     * @param user The user address to query
     */
    function getVerification(address user) external view returns (
        bool _isVerified,
        uint256 _verificationTimestamp,
        bytes32 _proofHash,
        uint256 _expiryTimestamp
    ) {
        Verification memory v = verifications[user];
        return (
            v.isVerified && v.expiryTimestamp > block.timestamp,
            v.verificationTimestamp,
            v.proofHash,
            v.expiryTimestamp
        );
    }

    /**
     * @notice Revoke a user's verification (admin only)
     * @param user The user address to revoke
     */
    function revokeVerification(address user) external onlyOwner {
        verifications[user].isVerified = false;
        emit Revoked(user, block.timestamp);
    }

    /**
     * @notice Update the trusted enclave address
     * @param _newEnclave The new enclave address
     */
    function updateTrustedEnclave(address _newEnclave) external onlyOwner {
        address oldEnclave = trustedEnclave;
        trustedEnclave = _newEnclave;
        emit EnclaveUpdated(oldEnclave, _newEnclave);
    }
}`;
}

/**
 * Generate mock transaction hash for development
 */
export async function generateMockTransactionHash(): Promise<string> {
  const randomBytes = new Uint8Array(32);
  crypto.getRandomValues(randomBytes);
  return '0x' + Array.from(randomBytes, b => b.toString(16).padStart(2, '0')).join('');
}
