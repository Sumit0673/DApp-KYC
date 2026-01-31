'use client';

import { useEffect } from 'react';
import { AlertCircle, Wallet } from 'lucide-react';
import { Header } from '@/components/kyc/header';
import { KYCForm } from '@/components/kyc/kyc-form';
import { VerificationProgress } from '@/components/kyc/verification-progress';
import { VerificationResultDisplay } from '@/components/kyc/verification-result';
import { InfoSidebar } from '@/components/kyc/info-sidebar';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useWallet } from '@/hooks/use-wallet';
import { useKYCVerification } from '@/hooks/use-kyc-verification';
import type { KYCData } from '@/lib/types/kyc';

export default function KYCVerificationPage() {
  const {
    isConnected,
    address,
    isCorrectNetwork,
    isConnecting,
    error: walletError,
    connect,
    disconnect,
    switchToArbitrumSepolia,
    clearError,
    provider,
    chainId,
  } = useWallet();

  const {
    status,
    currentStep,
    steps,
    protectedData,
    zkProof,
    verificationResult,
    transactionHash,
    error: verificationError,
    startVerification,
    reset,
  } = useKYCVerification(address, provider, chainId);

  const handleSubmit = async (kycData: KYCData) => {
    if (!isConnected) {
      connect();
      return;
    }
    await startVerification(kycData);
  };

  const isVerifying = ['encrypting', 'protecting', 'computing', 'verifying', 'submitting'].includes(status);
  const isCompleted = status === 'completed';
  const isFailed = status === 'failed';

  return (
    <div className="min-h-screen bg-background">
      <Header
        isConnected={isConnected}
        address={address}
        isCorrectNetwork={isCorrectNetwork}
        isConnecting={isConnecting}
        onConnect={connect}
        onDisconnect={disconnect}
        onSwitchNetwork={switchToArbitrumSepolia}
      />

      <main className="container mx-auto px-4 py-8">
        {walletError && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Wallet Error</AlertTitle>
            <AlertDescription className="flex items-center justify-between">
              <span>{walletError}</span>
              <Button variant="outline" size="sm" onClick={clearError}>
                Dismiss
              </Button>
            </AlertDescription>
          </Alert>
        )}

        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <div className="space-y-2">
              <h2 className="text-3xl font-bold tracking-tight text-foreground text-balance">
                Decentralized KYC Verification
              </h2>
              <p className="text-muted-foreground text-pretty">
                Verify your identity without exposing personal data. Powered by iExec confidential 
                computing and zero-knowledge proofs on Arbitrum.
              </p>
            </div>

            {!isConnected ? (
              <Card className="border-border/50">
                <CardHeader className="text-center">
                  <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                    <Wallet className="w-8 h-8 text-primary" />
                  </div>
                  <CardTitle className="text-foreground">Connect Your Wallet</CardTitle>
                  <CardDescription>
                    Connect your wallet to start the KYC verification process.
                    Make sure you are on Arbitrum Sepolia network.
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex justify-center">
                  <Button onClick={connect} disabled={isConnecting} size="lg" className="gap-2">
                    <Wallet className="w-4 h-4" />
                    {isConnecting ? 'Connecting...' : 'Connect Wallet'}
                  </Button>
                </CardContent>
              </Card>
            ) : !isCorrectNetwork ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Wrong Network</AlertTitle>
                <AlertDescription className="flex items-center justify-between">
                  <span>Please switch to Arbitrum Sepolia to continue.</span>
                  <Button variant="outline" size="sm" onClick={switchToArbitrumSepolia}>
                    Switch Network
                  </Button>
                </AlertDescription>
              </Alert>
            ) : isCompleted && verificationResult ? (
              <VerificationResultDisplay
                verificationResult={verificationResult}
                zkProof={zkProof}
                transactionHash={transactionHash}
                userAddress={address!}
                onReset={reset}
              />
            ) : (
              <>
                {(isVerifying || isFailed) && (
                  <VerificationProgress
                    status={status}
                    currentStep={currentStep}
                    steps={steps}
                    error={verificationError}
                  />
                )}

                {isFailed && (
                  <div className="flex justify-center">
                    <Button onClick={reset} variant="outline">
                      Try Again
                    </Button>
                  </div>
                )}

                {!isVerifying && !isFailed && (
                  <KYCForm
                    onSubmit={handleSubmit}
                    isDisabled={!isConnected || !isCorrectNetwork}
                  />
                )}
              </>
            )}
          </div>

          <div className="lg:col-span-1">
            <InfoSidebar />
          </div>
        </div>
      </main>

      <footer className="border-t border-border mt-16 py-8">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>Privacy-First Identity Verification for Web3</p>
          <p className="mt-1">No PII stored on-chain. Powered by iExec TEE.</p>
        </div>
      </footer>
    </div>
  );
}
