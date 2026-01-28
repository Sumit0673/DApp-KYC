'use client';

import { Shield, Lock, Eye, Zap, Database, FileCode2, Github, BookOpen } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

export function InfoSidebar() {
  return (
    <div className="space-y-6">
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-foreground">How It Works</CardTitle>
          <CardDescription>
            Privacy-preserving identity verification using confidential computing
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Lock className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="font-medium text-sm text-foreground">Client-Side Encryption</p>
              <p className="text-xs text-muted-foreground mt-1">
                Your identity data is encrypted in your browser before being sent anywhere.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Shield className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="font-medium text-sm text-foreground">TEE Processing</p>
              <p className="text-xs text-muted-foreground mt-1">
                Verification runs inside a Trusted Execution Environment. No one can see your data.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Eye className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="font-medium text-sm text-foreground">Zero-Knowledge Proofs</p>
              <p className="text-xs text-muted-foreground mt-1">
                ZK proofs verify attributes without revealing the underlying data.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <Database className="w-4 h-4 text-primary" />
            </div>
            <div>
              <p className="font-medium text-sm text-foreground">On-Chain Proof Only</p>
              <p className="text-xs text-muted-foreground mt-1">
                Only the verification result is stored on Arbitrum. No PII ever touches the blockchain.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Zap className="w-4 h-4" />
            Tech Stack
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Blockchain</span>
            <span className="font-medium text-foreground">Arbitrum</span>
          </div>
          <Separator />
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Confidential Computing</span>
            <span className="font-medium text-foreground">iExec TEE</span>
          </div>
          <Separator />
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Data Protection</span>
            <span className="font-medium text-foreground">DataProtector</span>
          </div>
          <Separator />
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Privacy Layer</span>
            <span className="font-medium text-foreground">ZK-SNARKs</span>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-foreground">Resources</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <Button
            variant="outline"
            className="w-full justify-start gap-2 bg-transparent"
            onClick={() => window.open('https://docs.iex.ec/get-started/quick-start', '_blank')}
          >
            <BookOpen className="w-4 h-4" />
            iExec Documentation
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start gap-2 bg-transparent"
            onClick={() => window.open('https://explorer.iex.ec/arbitrum-sepolia-testnet', '_blank')}
          >
            <Database className="w-4 h-4" />
            iExec Explorer
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start gap-2 bg-transparent"
            onClick={() => window.open('https://sepolia.arbiscan.io', '_blank')}
          >
            <FileCode2 className="w-4 h-4" />
            Arbitrum Explorer
          </Button>
          <Button
            variant="outline"
            className="w-full justify-start gap-2 bg-transparent"
            onClick={() => window.open('https://explorer.iex.ec/arbitrum-mainnet/faucet', '_blank')}
          >
            <Zap className="w-4 h-4" />
            Get RLC Tokens
          </Button>
        </CardContent>
      </Card>

      <div className="text-center text-xs text-muted-foreground">
        <p>Built with iExec Confidential Computing</p>
        <p className="mt-1">on Arbitrum Network</p>
      </div>
    </div>
  );
}
