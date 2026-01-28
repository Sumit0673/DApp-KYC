# zkKYC - Decentralized KYC Verification on Arbitrum

A privacy-preserving, decentralized KYC (Know Your Customer) verification dApp built on Arbitrum using iExec confidential computing and zero-knowledge proofs. Users can verify their identity without exposing personal information on-chain.

## Architecture Overview

```
User
 └── Wallet (MetaMask)
       |
       v
Frontend DApp (Next.js)
       |
       v
iExec Confidential Task (TEE)
       |
       v
Verification Result (Proof/Attestation)
       |
       v
Arbitrum Smart Contract (KYCVerifier)
       |
       v
DeFi Protocol (uses verification status)
```

## Current Flow

### 1. Connect Wallet
- User connects their MetaMask wallet
- App verifies they're on Arbitrum Sepolia (testnet) or Arbitrum Mainnet

### 2. Submit Identity Data
- User enters identity information (document type, number, name, DOB, nationality, expiry)
- Data is validated client-side

### 3. Client-Side Encryption
- Identity data is encrypted using AES-GCM before leaving the browser
- No plaintext data is ever transmitted

### 4. Zero-Knowledge Proof Generation
- ZK proof generated for age verification (proves 18+ without revealing exact DOB)
- ZK proof for document validity (proves not expired)
- Nullifier hash generated to prevent double-verification

### 5. TEE Verification (iExec)
- Encrypted data sent to iExec's Trusted Execution Environment
- Verification runs inside TEE where no one (not even node operators) can see the data
- TEE produces signed attestation of verification result

### 6. On-Chain Submission
- Verification proof submitted to KYCVerifier smart contract on Arbitrum
- Only the result (verified/not verified) and proof hash stored on-chain
- No PII ever touches the blockchain

### 7. DeFi Integration
- Any DeFi protocol can query `isVerified(address)` to check verification status
- Verification valid for 1 year from submission

## Project Structure

```
├── app/
│   ├── page.tsx              # Main KYC verification page
│   └── layout.tsx            # Root layout
├── components/
│   └── kyc/
│       ├── header.tsx        # Navigation header with wallet connection
│       ├── kyc-form.tsx      # Identity data input form
│       ├── verification-progress.tsx  # Step-by-step progress display
│       ├── verification-result.tsx    # Success screen with proof details
│       └── info-sidebar.tsx  # Information about the process
├── hooks/
│   ├── use-wallet.ts         # Wallet connection hook
│   └── use-kyc-verification.ts  # Verification flow state management
├── lib/
│   ├── types/
│   │   └── kyc.ts           # TypeScript types and network configs
│   ├── utils/
│   │   └── crypto.ts        # Cryptographic utilities
│   └── services/
│       ├── iexec.ts         # iExec DataProtector integration
│       ├── contract.ts      # Smart contract interaction
│       └── zkproof.ts       # Zero-knowledge proof generation
```

## Making Changes

### Changing Minimum Age Requirement

In `lib/services/zkproof.ts`, modify the `minimumAge` parameter:

```typescript
const zkProof = await generateFullKYCProof(kycData, userAddress, {
  minimumAge: 21, // Change from 18 to 21
});
```

### Adding New Document Types

In `lib/types/kyc.ts`, add to the `DocumentType` type:

```typescript
export type DocumentType = 
  | 'passport' 
  | 'national_id' 
  | 'driving_license' 
  | 'aadhaar' 
  | 'pan_card'
  | 'voter_id';  // Add new type
```

Then update the form in `components/kyc/kyc-form.tsx`:

```typescript
const DOCUMENT_TYPES = [
  // ... existing types
  { value: 'voter_id', label: 'Voter ID' },
];
```

### Adding Nationality Restrictions

In `hooks/use-kyc-verification.ts`, pass allowed nationalities:

```typescript
const zkProof = await generateFullKYCProof(kycData, userAddress, {
  minimumAge: 18,
  allowedNationalities: ['United States', 'Canada', 'United Kingdom'],
});
```

### Switching to Mainnet

Update environment variables:
```env
NEXT_PUBLIC_CHAIN_ID=42161
```

The app automatically uses the correct network config based on chain ID.

## Deploying the iExec iApp

### 1. Install iApp Generator

```bash
npm install -g @iexec/iapp
```

### 2. Initialize Your iApp

```bash
iapp init
```

### 3. Customize Verification Logic

Edit `src/verify.js` in your iApp:

```javascript
module.exports = async function (encryptedData) {
  const identity = decrypt(encryptedData);
  
  // Age verification
  const birthDate = new Date(identity.dateOfBirth);
  const today = new Date();
  const age = today.getFullYear() - birthDate.getFullYear();
  if (age < 18) return false;
  
  // Document validity
  const expiry = new Date(identity.expiryDate);
  if (expiry < today) return false;
  
  // Sanctions check (implement your logic)
  // const isSanctioned = await checkSanctionsList(identity);
  // if (isSanctioned) return false;
  
  return true;
};
```

### 4. Test Your iApp

```bash
iapp test
```

### 5. Deploy to Arbitrum Sepolia

```bash
# Import your wallet
iapp wallet import <your-private-key>

# Deploy
iapp deploy --chain arbitrum-sepolia-testnet
```

### 6. Update Frontend

Set the deployed app address:
```env
NEXT_PUBLIC_IEXEC_APP_ADDRESS=0x...
```

## Deploying the Smart Contract

### 1. Get Contract Code

The contract code is generated in `lib/services/contract.ts`. Call:

```typescript
import { generateContractCode } from '@/lib/services/contract';
const contractCode = generateContractCode();
```

### 2. Deploy Using Foundry/Hardhat

```bash
# Using Foundry
forge create --rpc-url https://sepolia-rollup.arbitrum.io/rpc \
  --private-key $PRIVATE_KEY \
  KYCVerifier \
  --constructor-args $TRUSTED_ENCLAVE_ADDRESS
```

### 3. Update Frontend

```env
NEXT_PUBLIC_KYC_VERIFIER_ADDRESS=0x...
```

## Zero-Knowledge Circuits

The ZK circuits are in `lib/services/zkproof.ts`. To use real ZK proofs:

### 1. Install Circom

```bash
npm install -g circom snarkjs
```

### 2. Compile the Circuit

```bash
circom circuits/age_verification.circom --r1cs --wasm --sym
```

### 3. Generate Proving/Verification Keys

```bash
snarkjs groth16 setup age_verification.r1cs pot12_final.ptau age_verification_0000.zkey
snarkjs zkey contribute age_verification_0000.zkey age_verification_final.zkey
snarkjs zkey export verificationkey age_verification_final.zkey verification_key.json
```

### 4. Integrate with Frontend

Replace the simulated proof generation in `lib/services/zkproof.ts` with actual snarkjs calls.

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_IEXEC_APP_ADDRESS` | Deployed iExec iApp address | - |
| `NEXT_PUBLIC_KYC_VERIFIER_ADDRESS` | Deployed KYCVerifier contract | - |
| `NEXT_PUBLIC_CHAIN_ID` | Target chain ID | 421614 (Sepolia) |

## Network Configuration

### Arbitrum Sepolia (Testnet)
- Chain ID: 421614
- RPC: https://sepolia-rollup.arbitrum.io/rpc
- Explorer: https://sepolia.arbiscan.io
- iExec Explorer: https://explorer.iex.ec/arbitrum-sepolia-testnet
- Workerpool: `0xB967057a21dc6A66A29721d96b8Aa7454B7c383F`

### Arbitrum Mainnet
- Chain ID: 42161
- Workerpool: `0x2C06263943180Cc024dAFfeEe15612DB6e5fD248`

## Getting Tokens

1. **RLC (iExec tokens)**: [iExec Faucet](https://explorer.iex.ec/arbitrum-mainnet/faucet)
2. **ETH on Sepolia**: Use [Arbitrum Bridge](https://portal.arbitrum.io/bridge) after getting Sepolia ETH

## Security Considerations

1. **No PII On-Chain**: Only proof hashes and verification status stored
2. **Client-Side Encryption**: Data encrypted before leaving browser
3. **TEE Protection**: Verification runs in isolated enclave
4. **Nullifier Hashes**: Prevent double-verification attacks
5. **Time-Limited Verification**: Proofs expire after 1 year
6. **Enclave Signatures**: Results cryptographically signed by TEE

## DeFi Integration Example

```solidity
// In your DeFi contract
import "./IKYCVerifier.sol";

contract LendingProtocol {
    IKYCVerifier public kycVerifier;
    
    constructor(address _kycVerifier) {
        kycVerifier = IKYCVerifier(_kycVerifier);
    }
    
    function deposit() external {
        require(kycVerifier.isVerified(msg.sender), "KYC required");
        // ... deposit logic
    }
}
```

## License

MIT
