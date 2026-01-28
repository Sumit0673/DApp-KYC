'use client';

import { CheckCircle2, ExternalLink, Copy, Shield, FileKey, Clock, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { VerificationResult, ZKProof } from '@/lib/types/kyc';
import { useState } from 'react';

interface VerificationResultDisplayProps {
  verificationResult: VerificationResult;
  zkProof: ZKProof | null;
  transactionHash: string | null;
  userAddress: string;
  onReset: () => void;
}

export function VerificationResultDisplay({
  verificationResult,
  zkProof,
  transactionHash,
  userAddress,
  onReset,
}: VerificationResultDisplayProps) {
  const [copied, setCopied] = useState<string | null>(null);

  const copyToClipboard = async (text: string, label: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  const truncateHash = (hash: string, chars: number = 8) => {
    if (hash.length <= chars * 2) return hash;
    return `${hash.slice(0, chars)}...${hash.slice(-chars)}`;
  };

  return (
    <div className="space-y-6">
      <Card className="border-emerald-500/30 bg-emerald-500/5">
        <CardHeader className="text-center pb-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mb-4">
            <CheckCircle2 className="w-8 h-8 text-emerald-500" />
          </div>
          <CardTitle className="text-2xl text-foreground">Identity Verified</CardTitle>
          <CardDescription>
            Your KYC verification has been successfully completed and recorded on Arbitrum.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2 justify-center">
            {verificationResult.attributes.isAdult && (
              <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                Age Verified (18+)
              </Badge>
            )}
            {verificationResult.attributes.isNotExpired && (
              <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                Valid Document
              </Badge>
            )}
            {verificationResult.attributes.isNotSanctioned && (
              <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                Sanctions Clear
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-foreground">
            <Shield className="w-4 h-4" />
            Verification Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4">
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="w-4 h-4" />
                Verified At
              </div>
              <span className="text-sm font-mono text-foreground">
                {formatDate(verificationResult.timestamp)}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <FileKey className="w-4 h-4" />
                Proof Hash
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-mono text-foreground">
                  {truncateHash(verificationResult.proofHash)}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => copyToClipboard(verificationResult.proofHash, 'proof')}
                >
                  <Copy className="w-3 h-3" />
                </Button>
              </div>
            </div>

            {zkProof && (
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Shield className="w-4 h-4" />
                  ZK Nullifier
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-mono text-foreground">
                    {truncateHash(zkProof.nullifierHash)}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => copyToClipboard(zkProof.nullifierHash, 'nullifier')}
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            )}

            {transactionHash && (
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <ExternalLink className="w-4 h-4" />
                  Transaction
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-mono text-foreground">
                    {truncateHash(transactionHash)}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => window.open(`https://sepolia.arbiscan.io/tx/${transactionHash}`, '_blank')}
                  >
                    <ExternalLink className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            )}
          </div>

          {copied && (
            <p className="text-xs text-center text-emerald-600">Copied to clipboard!</p>
          )}
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-base text-foreground">Integration Code</CardTitle>
          <CardDescription>
            Use this code snippet to check verification in your DeFi protocol
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-muted rounded-lg p-4 font-mono text-xs overflow-x-auto">
            <pre className="text-muted-foreground">
{`// Solidity integration
require(
  KYCVerifier.isVerified(msg.sender),
  "KYC required"
);

// JavaScript check
const isVerified = await kycVerifier.isVerified(
  "${userAddress}"
);`}
            </pre>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-center">
        <Button variant="outline" onClick={onReset} className="gap-2 bg-transparent">
          <RefreshCw className="w-4 h-4" />
          Start New Verification
        </Button>
      </div>
    </div>
  );
}
