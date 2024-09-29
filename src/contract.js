import React, { useEffect, useState } from "react";
import {
  Connection,
  PublicKey,
  clusterApiUrl,
  Keypair,
  SystemProgram,
} from "@solana/web3.js";
import { AnchorProvider, Program } from "@coral-xyz/anchor";
import idl from "./Contract/roulette.json";
import a from "./wallet/playerone.json"; // Replace with the path to your IDL JSON file
import b from "./wallet/playertwo.json"; // Replace with the path to your IDL JSON file
import { Buffer } from "buffer";
// Hardcoded wallet addresses for player one and player two
const PLAYER_ONE_SECRET_KEY = new Uint8Array(a);
const PLAYER_TWO_SECRET_KEY = new Uint8Array(b);

const playerOneWallet = Keypair.fromSecretKey(PLAYER_ONE_SECRET_KEY);
const playerTwoWallet = Keypair.fromSecretKey(PLAYER_TWO_SECRET_KEY);
// Replace with your actual program ID
const PROGRAM_ID = new PublicKey("mvtjnnwtwXKExeWAoMwemapbBxa2QUsr3TQfWHmMmzf");
const connection = new Connection("http://127.0.0.1:8899", "confirmed");

const RouletteGame = () => {
  const [sessionAddress, setSessionAddress] = useState(null);
  const [currentPlayer, setCurrentPlayer] = useState(playerOneWallet);

  // Create an Anchor provider
  const provider = new AnchorProvider(connection, window.solana, {
    commitment: "confirmed",
  });

  // Create a program instance
  const program = new Program(idl, provider);

  // Create a new session address
  const createSessionAddress = async () => {
    const [sessionAddress] = PublicKey.findProgramAddressSync(
      [Buffer.from("session")],
      PROGRAM_ID
    );
    return sessionAddress;
  };

  const joinSession = async () => {
    const sessionAddr = await createSessionAddress();
    try {
      await program.methods
        .joinSession()
        .accounts({
          session: sessionAddr,
          player: currentPlayer.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      setSessionAddress(sessionAddr);
    } catch (error) {
      console.error("Error joining session:", error);
    }
  };

  const shootSelf = async () => {
    if (!sessionAddress) return;
    try {
      await program.methods
        .shoot(currentPlayer.publicKey)
        .accounts({
          session: sessionAddress,
          shooter: currentPlayer.publicKey,
        })
        .rpc();
      // Logic to switch to the other player
      setCurrentPlayer(
        currentPlayer === playerOneWallet ? playerTwoWallet : playerOneWallet
      );
    } catch (error) {
      console.error("Error shooting self:", error);
    }
  };

  const shootOpponent = async () => {
    if (!sessionAddress) return;
    try {
      const opponent =
        currentPlayer === playerOneWallet ? playerTwoWallet : playerOneWallet;
      await program.methods
        .shoot(opponent.publicKey)
        .accounts({
          session: sessionAddress,
          shooter: currentPlayer.publicKey,
        })
        .rpc();
      // Logic to switch to the other player
      setCurrentPlayer(opponent);
    } catch (error) {
      console.error("Error shooting opponent:", error);
    }
  };

  useEffect(() => {
    joinSession();
  }, []);

  return (
    <div>
      <h1>Russian Roulette</h1>
      <h2>Current Player: {currentPlayer.publicKey.toString()}</h2>
      <button onClick={shootSelf} className="border-2">
        Shoot Self
      </button>
      <button onClick={shootOpponent} className="border-2">
        Shoot Opponent
      </button>
    </div>
  );
};

export default RouletteGame;
