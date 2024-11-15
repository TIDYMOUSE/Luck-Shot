// src/global.d.ts

import { PublicKey } from "@solana/web3.js";

interface PhantomWallet {
  connect: () => Promise<{ publicKey: PublicKey }>;
  disconnect: () => Promise<void>;
  signTransaction: (transaction: any) => Promise<any>;
  signAllTransactions: (transactions: any[]) => Promise<any[]>;
  signMessage: (message: Uint8Array) => Promise<Uint8Array>;
  on(event: string, listener: (...args: any[]) => void): void;
  removeListener(event: string, listener: (...args: any[]) => void): void;
  // Add any additional methods from the Phantom wallet that you want to support
  request: (args: { method: string; params?: any[] }) => Promise<any>;
  handleNotification: (notification: any) => void; // For handling notifications if needed
  isPhantom: boolean; // To check if the wallet is Phantom
}

declare global {
  interface Window {
    solana: PhantomWallet | null; // Allows null for cases where Phantom is not installed
  }
}
