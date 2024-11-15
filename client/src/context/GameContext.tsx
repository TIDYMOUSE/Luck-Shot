import { PublicKey } from "@solana/web3.js";
import { createContext, useContext, useState, ReactNode } from "react";
import { BN } from "@coral-xyz/anchor";
import { JoinInstruction } from "../types/support";

interface GameVariables {
  playerAddress: PublicKey | null;
  uid: Number;
  playerOne: PublicKey | undefined;
  playerTwo: PublicKey | undefined;
  join_instruction: JoinInstruction | undefined;
  setPlayerAddress: (address: PublicKey | null) => void;
  setUid: (uid: Number) => void;
  setPlayerTwoAddress: (address: PublicKey) => void;
  setPlayerOneAddress: (address: PublicKey) => void;
  isPlayerOne: boolean;
  setIsPlayerOne: (bool: boolean) => void;
  setJoinInstruction: (instruction: JoinInstruction) => void;
}

const GameContext = createContext<GameVariables | undefined>(undefined);

interface GameContextProviderProps {
  children: ReactNode;
}

export const GameContextProvider: React.FC<GameContextProviderProps> = ({
  children,
}) => {
  const [playerAddress, setPlayerAddress] = useState<PublicKey | null>(null);

  const [playerTwo, setPlayerTwo] = useState<PublicKey | undefined>(undefined);
  const [playerOne, setPlayerOne] = useState<PublicKey | undefined>(undefined);
  const [isPlayerOne, setIsPlayerOne] = useState<boolean>(true);
  const [join_instruction, _setJoinInstruction] = useState<
    JoinInstruction | undefined
  >(undefined);
  const [uid, setUid] = useState<BN>(new BN(-1));

  // Function to set playerTwo's address independently
  const setPlayerTwoAddress = (address: PublicKey) => {
    setPlayerTwo(address);
  };

  const setPlayerOneAddress = (address: PublicKey) => {
    setPlayerOne(playerOne);
  };

  const setJoinInstruction = (instruction: JoinInstruction) => {
    _setJoinInstruction(instruction);
  };

  return (
    <GameContext.Provider
      value={{
        playerAddress,
        uid,
        playerOne,
        playerTwo,
        join_instruction,
        setPlayerAddress,
        setUid,
        setPlayerTwoAddress,
        setPlayerOneAddress,
        isPlayerOne,
        setIsPlayerOne,
        setJoinInstruction,
      }}
    >
      {children}
    </GameContext.Provider>
  );
};

// Custom hook for accessing the GameContext
export const useGameContext = (): GameVariables => {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error("useGameContext must be used within a GameContextProvider");
  }
  return context;
};
