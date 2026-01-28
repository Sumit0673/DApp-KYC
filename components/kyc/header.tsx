'use client';

import { Shield, Wallet, ChevronDown, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';

interface HeaderProps {
  isConnected: boolean;
  address: string | null;
  isCorrectNetwork: boolean;
  isConnecting: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  onSwitchNetwork: () => void;
}

export function Header({
  isConnected,
  address,
  isCorrectNetwork,
  isConnecting,
  onConnect,
  onDisconnect,
  onSwitchNetwork,
}: HeaderProps) {
  const truncateAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
            <Shield className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-semibold text-foreground">zkKYC</h1>
            <p className="text-xs text-muted-foreground">Decentralized Identity</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isConnected && !isCorrectNetwork && (
            <Button
              variant="destructive"
              size="sm"
              onClick={onSwitchNetwork}
              className="gap-2"
            >
              Wrong Network
            </Button>
          )}

          {isConnected && isCorrectNetwork && (
            <Badge variant="outline" className="gap-1.5 px-3 py-1.5 bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Arbitrum Sepolia
            </Badge>
          )}

          {!isConnected ? (
            <Button
              onClick={onConnect}
              disabled={isConnecting}
              className="gap-2"
            >
              <Wallet className="w-4 h-4" />
              {isConnecting ? 'Connecting...' : 'Connect Wallet'}
            </Button>
          ) : (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2 bg-transparent">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  {truncateAddress(address!)}
                  <ChevronDown className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem
                  onClick={() => window.open(`https://sepolia.arbiscan.io/address/${address}`, '_blank')}
                  className="gap-2"
                >
                  <ExternalLink className="w-4 h-4" />
                  View on Explorer
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={onDisconnect}
                  className="text-destructive focus:text-destructive"
                >
                  Disconnect
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  );
}
