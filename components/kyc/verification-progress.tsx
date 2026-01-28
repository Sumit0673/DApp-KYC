'use client';

import { CheckCircle2, Circle, Loader2, XCircle, Shield, Lock, Cpu, FileCheck, Send, PartyPopper } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import type { VerificationStatus } from '@/lib/types/kyc';
import { cn } from '@/lib/utils';

interface VerificationProgressProps {
  status: VerificationStatus;
  currentStep: number;
  steps: string[];
  error?: string | null;
}

const STEP_ICONS = [
  Shield,      // Connect Wallet
  FileCheck,   // Submit Identity
  Lock,        // Encrypt Data
  Cpu,         // Generate ZK Proof
  Shield,      // TEE Verification
  Send,        // Submit On-Chain
  PartyPopper, // Complete
];

export function VerificationProgress({
  status,
  currentStep,
  steps,
  error,
}: VerificationProgressProps) {
  const progress = (currentStep / (steps.length - 1)) * 100;

  const getStepStatus = (index: number) => {
    if (status === 'failed' && index === currentStep) return 'failed';
    if (index < currentStep) return 'completed';
    if (index === currentStep) return 'active';
    return 'pending';
  };

  const getStatusMessage = () => {
    switch (status) {
      case 'encrypting':
        return 'Encrypting your identity data with client-side encryption...';
      case 'protecting':
        return 'Protecting data with iExec DataProtector...';
      case 'computing':
        return 'Generating zero-knowledge proof...';
      case 'verifying':
        return 'Processing in Trusted Execution Environment (TEE)...';
      case 'submitting':
        return 'Submitting verification proof to Arbitrum...';
      case 'completed':
        return 'Verification complete! Your identity has been verified.';
      case 'failed':
        return error || 'Verification failed. Please try again.';
      default:
        return 'Ready to verify your identity';
    }
  };

  return (
    <Card className={cn(
      "border-border/50 transition-colors",
      status === 'completed' && "border-emerald-500/30 bg-emerald-500/5",
      status === 'failed' && "border-destructive/30 bg-destructive/5"
    )}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-foreground">
          {status === 'completed' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          ) : status === 'failed' ? (
            <XCircle className="w-5 h-5 text-destructive" />
          ) : (
            <Shield className="w-5 h-5" />
          )}
          Verification Progress
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Step {Math.min(currentStep + 1, steps.length)} of {steps.length}
            </span>
            <span className="font-medium text-foreground">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <div className={cn(
          "p-4 rounded-lg text-sm",
          status === 'completed' && "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
          status === 'failed' && "bg-destructive/10 text-destructive",
          !['completed', 'failed'].includes(status) && "bg-muted text-muted-foreground"
        )}>
          <div className="flex items-center gap-2">
            {!['completed', 'failed', 'idle'].includes(status) && (
              <Loader2 className="w-4 h-4 animate-spin" />
            )}
            {getStatusMessage()}
          </div>
        </div>

        <div className="space-y-3">
          {steps.map((step, index) => {
            const stepStatus = getStepStatus(index);
            const Icon = STEP_ICONS[index] || Circle;

            return (
              <div
                key={step}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg transition-all",
                  stepStatus === 'completed' && "bg-emerald-500/10",
                  stepStatus === 'active' && "bg-primary/10",
                  stepStatus === 'failed' && "bg-destructive/10",
                  stepStatus === 'pending' && "opacity-50"
                )}
              >
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                  stepStatus === 'completed' && "bg-emerald-500 text-background",
                  stepStatus === 'active' && "bg-primary text-primary-foreground",
                  stepStatus === 'failed' && "bg-destructive text-background",
                  stepStatus === 'pending' && "bg-muted text-muted-foreground"
                )}>
                  {stepStatus === 'completed' ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : stepStatus === 'active' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : stepStatus === 'failed' ? (
                    <XCircle className="w-4 h-4" />
                  ) : (
                    <Icon className="w-4 h-4" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    "font-medium text-sm",
                    stepStatus === 'completed' && "text-emerald-700 dark:text-emerald-400",
                    stepStatus === 'active' && "text-foreground",
                    stepStatus === 'failed' && "text-destructive",
                    stepStatus === 'pending' && "text-muted-foreground"
                  )}>
                    {step}
                  </p>
                </div>
                {stepStatus === 'completed' && (
                  <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                    Done
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
