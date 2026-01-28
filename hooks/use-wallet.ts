'use client';

import { useState, useCallback, useEffect } from 'react';
import { ARBITRUM_SEPOLIA_CONFIG, ARBITRUM_MAINNET_CONFIG } from '@/lib/types/kyc';

export interface WalletState {
  isConnected: boolean;
  address: string | null;
  chainId: number | null;
  isCorrectNetwork: boolean;
  provider: unknown | null;
}

const ARBITRUM_SEPOLIA_CHAIN_ID = 421614;
const ARBITRUM_MAINNET_CHAIN_ID = 42161;

export function useWallet() {
  const [walletState, setWalletState] = useState<WalletState>({
    isConnected: false,
    address: null,
    chainId: null,
    isCorrectNetwork: false,
    provider: null,
  });
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check if ethereum is available
  const getEthereum = useCallback(() => {
    if (typeof window !== 'undefined' && window.ethereum) {
      return window.ethereum;
    }
    return null;
  }, []);

  // Check current connection status
  const checkConnection = useCallback(async () => {
    const ethereum = getEthereum();
    if (!ethereum) return;

    try {
      const accounts = await ethereum.request({ method: 'eth_accounts' });
      const chainId = await ethereum.request({ method: 'eth_chainId' });
      const chainIdNum = parseInt(chainId, 16);

      if (accounts && accounts.length > 0) {
        setWalletState({
          isConnected: true,
          address: accounts[0],
          chainId: chainIdNum,
          isCorrectNetwork: chainIdNum === ARBITRUM_SEPOLIA_CHAIN_ID || chainIdNum === ARBITRUM_MAINNET_CHAIN_ID,
          provider: ethereum,
        });
      }
    } catch (err) {
      console.error('[v0] Failed to check wallet connection:', err);
    }
  }, [getEthereum]);

  // Connect wallet
  const connect = useCallback(async () => {
    const ethereum = getEthereum();
    if (!ethereum) {
      setError('MetaMask or compatible wallet not found. Please install MetaMask.');
      return;
    }

    setIsConnecting(true);
    setError(null);

    try {
      const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
      const chainId = await ethereum.request({ method: 'eth_chainId' });
      const chainIdNum = parseInt(chainId, 16);

      setWalletState({
        isConnected: true,
        address: accounts[0],
        chainId: chainIdNum,
        isCorrectNetwork: chainIdNum === ARBITRUM_SEPOLIA_CHAIN_ID || chainIdNum === ARBITRUM_MAINNET_CHAIN_ID,
        provider: ethereum,
      });
    } catch (err: unknown) {
      const error = err as { code?: number; message?: string };
      if (error.code === 4001) {
        setError('Connection rejected. Please approve the connection request.');
      } else {
        setError('Failed to connect wallet. Please try again.');
      }
      console.error('[v0] Wallet connection error:', err);
    } finally {
      setIsConnecting(false);
    }
  }, [getEthereum]);

  // Disconnect wallet
  const disconnect = useCallback(() => {
    setWalletState({
      isConnected: false,
      address: null,
      chainId: null,
      isCorrectNetwork: false,
      provider: null,
    });
  }, []);

  // Switch to Arbitrum Sepolia
  const switchToArbitrumSepolia = useCallback(async () => {
    const ethereum = getEthereum();
    if (!ethereum) return;

    try {
      await ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${ARBITRUM_SEPOLIA_CHAIN_ID.toString(16)}` }],
      });
    } catch (err: unknown) {
      const error = err as { code?: number };
      // Chain not added, let's add it
      if (error.code === 4902) {
        try {
          await ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: `0x${ARBITRUM_SEPOLIA_CHAIN_ID.toString(16)}`,
              chainName: 'Arbitrum Sepolia',
              nativeCurrency: {
                name: 'ETH',
                symbol: 'ETH',
                decimals: 18,
              },
              rpcUrls: ['https://sepolia-rollup.arbitrum.io/rpc'],
              blockExplorerUrls: ['https://sepolia.arbiscan.io'],
            }],
          });
        } catch (addErr) {
          console.error('[v0] Failed to add Arbitrum Sepolia:', addErr);
          setError('Failed to add Arbitrum Sepolia network.');
        }
      } else {
        console.error('[v0] Failed to switch network:', err);
        setError('Failed to switch to Arbitrum Sepolia.');
      }
    }
  }, [getEthereum]);

  // Listen for account/chain changes
  useEffect(() => {
    const ethereum = getEthereum();
    if (!ethereum) return;

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        disconnect();
      } else {
        setWalletState(prev => ({
          ...prev,
          address: accounts[0],
        }));
      }
    };

    const handleChainChanged = (chainId: string) => {
      const chainIdNum = parseInt(chainId, 16);
      setWalletState(prev => ({
        ...prev,
        chainId: chainIdNum,
        isCorrectNetwork: chainIdNum === ARBITRUM_SEPOLIA_CHAIN_ID || chainIdNum === ARBITRUM_MAINNET_CHAIN_ID,
      }));
    };

    ethereum.on('accountsChanged', handleAccountsChanged);
    ethereum.on('chainChanged', handleChainChanged);

    // Check initial connection
    checkConnection();

    return () => {
      ethereum.removeListener('accountsChanged', handleAccountsChanged);
      ethereum.removeListener('chainChanged', handleChainChanged);
    };
  }, [getEthereum, disconnect, checkConnection]);

  return {
    ...walletState,
    isConnecting,
    error,
    connect,
    disconnect,
    switchToArbitrumSepolia,
    clearError: () => setError(null),
  };
}

// Add ethereum type to window
declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      on: (event: string, callback: (...args: unknown[]) => void) => void;
      removeListener: (event: string, callback: (...args: unknown[]) => void) => void;
    };
  }
}
