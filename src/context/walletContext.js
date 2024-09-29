import React, { createContext, useContext, useState } from "react";
import { PublicKey } from "@solana/web3.js";
import { toast } from "react-toastify";

const WalletContext = createContext();

export const WalletProvider = ({ children }) => {
  const [walletAddress, setWalletAddress] = useState(null);
  const [connected, setConnected] = useState(false);

  const connectWallet = async () => {
    if (window.solana && window.solana.isPhantom) {
      try {
        const response = await window.solana.connect();
        setWalletAddress(new PublicKey(response.publicKey.toString()));
        setConnected(true);
        toast.success(
          `Wallet connected : ${response.publicKey.toString()?.slice(0, 8)}...`
        );
      } catch (err) {
        console.error("Failed to connect to wallet:", err);
        toast.error("Failed to connect to wallet");
      }
    } else {
      console.log("Phantom Wallet not installed");
      toast.error("Phantom Wallet not installed");
    }
  };

  // Disconnect the wallet
  const disconnectWallet = () => {
    setWalletAddress(null);
    setConnected(false);
    toast.success(`Wallet disconnected`);
  };

  return (
    <WalletContext.Provider
      value={{
        walletAddress,
        connected,
        connectWallet,
        disconnectWallet,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

// Custom hook to use the wallet context
export const useWallet = () => {
  return useContext(WalletContext);
};
