import "./App.css";
import { Player } from "@lottiefiles/react-lottie-player";
import { useWallet } from "./context/walletContext";
import { NavLink } from "react-router-dom";

function App() {
  const { walletAddress, connected, connectWallet, disconnectWallet } =
    useWallet();

  return (
    <main className="bg-background text-white min-h-screen">
      <section className="h-screen flex flex-col justify-center items-center">
        <Player src="/assets/hero.json" autoplay loop className="h-64" />

        <h1 className="text-6xl  font-heading tracking-tight font-medium ">
          Russian Roulette
        </h1>
        <div className=" font-base tracking-tight text-primary">
          Win awesome rewards backed with{" "}
          <img
            src="/assets/solanaLogo.png"
            alt="Solana's"
            className="w-28 relative top-[-2px]  inline"
          />
        </div>
        {connected ? (
          <div className="flex gap-3">
            <NavLink
              to="board"
              className="h-12 flex items-center rounded-xl px-9 font-bold bg-[#020D19] text-secondary hover:text-white font-idea mt-3"
            >
              Go to Board
            </NavLink>
            <button
              onClick={disconnectWallet}
              className="h-12 rounded-xl px-5 font-bold bg-[#020D19] text-accent hover:text-white font-idea mt-3"
            >
              Disconnect Wallet
            </button>
          </div>
        ) : (
          <button
            className="h-12 rounded-xl px-9 font-bold bg-[#020D19] text-accent hover:text-white font-idea mt-3"
            onClick={connectWallet}
          >
            PLAY
          </button>
        )}
      </section>
    </main>
  );
}

export default App;
