import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom";
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { clusterApiUrl } from "@solana/web3.js";

const endpoint = clusterApiUrl("devnet");
const wallets = [new PhantomWalletAdapter()];

// export const useWallet = () => useContext(WalletContext);

// Provider
export const SolanaWalletProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect={true}>
        {children}
      </WalletProvider>
    </ConnectionProvider>
  );
};
