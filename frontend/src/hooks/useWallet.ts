import { useState, useCallback, useEffect } from 'react';
import { getWallets, WalletName } from "@massalabs/wallet-provider";
import { web3 } from '@hicaru/bearby.js';

interface WalletProvider {
  address: string;
  name: string;
}

interface UseWalletReturn {
  isConnected: boolean;
  userAddress: string;
  provider: WalletProvider | null;
  loading: boolean;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  userMasBalance: bigint | null;
}

export function useWallet(): UseWalletReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [userAddress, setUserAddress] = useState('');
  const [provider, setProvider] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userMasBalance, setUserMasBalance] = useState<bigint | null>(null);

  useEffect(()=>{
    connect()
  },[])

  const connect = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const walletList = await getWallets();
      const wallet = walletList.find((w) => w.name() === WalletName.MassaWallet);

      if (!wallet) {
        throw new Error(
          "Massa Wallet not detected. Please install the Massa wallet and configure it for the Buildnet network"
        );
      }

      const accounts = await wallet.accounts();
      console.log(accounts)
      if (accounts.length === 0) {
        throw new Error("No accounts found. Please create an account in your Massa wallet");
      }

      const walletProvider = accounts[0];

      setUserAddress(walletProvider.address);
      setProvider(walletProvider); // Set the full IAccount object
      setIsConnected(true);

      const balance = await walletProvider.balance(true); // Use .balance() method
      setUserMasBalance(balance);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to connect wallet';
      setError(errorMessage);
      console.error('Wallet connection failed:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setIsConnected(false);
    setUserAddress('');
    setProvider(null);
    setError(null);
    setUserMasBalance(null);
  }, []);

  // Check for existing wallet connection on mount
  useEffect(() => {
    connect(); // Simply call connect to establish the connection and fetch balance
  }, [connect]);

  return {
    isConnected,
    userAddress,
    provider,
    loading,
    error,
    connect,
    disconnect,
    userMasBalance
  };
}
