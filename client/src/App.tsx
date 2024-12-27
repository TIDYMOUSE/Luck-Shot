import { Player } from "@lottiefiles/react-lottie-player";
import { useWallet } from "@solana/wallet-adapter-react";
import {
  WalletDisconnectButton,
  WalletMultiButton,
} from "@solana/wallet-adapter-react-ui";
import { useNavigate } from "react-router-dom";
import { useGameContext } from "./context/GameContext";
require("@solana/wallet-adapter-react-ui/styles.css");

function App() {
  const { connected, publicKey } = useWallet();
  const { setPlayerAddress } = useGameContext();
  const navigate = useNavigate();

  const handleProceed = () => {
    setPlayerAddress(publicKey);
    navigate("/finding");
  };

  return (
    <main className="bg-background text-white min-h-screen">
      <section className="h-screen flex flex-col justify-center items-center">
        <Player src="/assets/hero.json" autoplay loop className="h-64" />

        <h1 className="text-6xl  font-heading tracking-tight font-medium    ">
          Russian Roulette
        </h1>
        <div className=" font-base tracking-tight text-primary">
          Win awesome rewards backed with{" "}
          <img
            src="/assets/solanaLogo.png"
            alt="Solana"
            className="w-28 relative top-[-2px]  inline"
          />
        </div>

        {connected ? (
          <div className="flex mt-3 gap-3">
            <button
              onClick={handleProceed}
              className=" flex items-center rounded-lg px-9 font-bold bg-[#020D19] text-secondary hover:text-white font-idea"
            >
              Go to Board
            </button>
            <WalletDisconnectButton />
          </div>
        ) : (
          <WalletMultiButton />
        )}
      </section>
    </main>
  );
}

export default App;
