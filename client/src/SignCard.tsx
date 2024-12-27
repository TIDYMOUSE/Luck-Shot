import React from "react";
import { useGameContext } from "./context/GameContext";
import { useNavigate } from "react-router-dom";
import * as anchor from "@coral-xyz/anchor";
import { Roullete } from "./types/contracy";
import idl from "./Contract/roulette.json";
import { PublicKey } from "@solana/web3.js";
import {
  AnchorWallet,
  useConnection,
  useWallet,
} from "@solana/wallet-adapter-react";
import { Action, GoQueueAction } from "./types/support";

interface SignCardProps {
  sock: WebSocket;
}

function SignCard({ sock }: SignCardProps) {
  const { uid, playerAddress, join_instruction, isPlayerOne } =
    useGameContext();
  const navigate = useNavigate();
  const wallet = useWallet();
  const { connection } = useConnection();
  // console.log(connection);
  const provider = new anchor.AnchorProvider(
    connection,
    wallet as AnchorWallet,
    {
      commitment: "confirmed",
    }
  );

  const getSessionAddress = (
    playerOne: PublicKey,
    playerTwo: PublicKey,
    program: anchor.Program<Roullete>,
    uid: Number
  ) => {
    const [sessionAddress] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("session"),
        playerOne.toBuffer(),
        playerTwo.toBuffer(),
        new anchor.BN(uid).toArrayLike(Buffer, "le", 8),
      ],
      program.programId
    );
    return sessionAddress;
  };

  const checkGameStats = async (
    program: anchor.Program<Roullete>,
    gameKey: PublicKey
  ) => {
    const session = await program.account.session.fetch(gameKey);
    console.log(`
      player one: ${session.playerOne.toBase58()}
      player two: ${session.playerTwo.toBase58()}
      ${session.state.won ? session.state.won.winner.toBase58() : "active"}
      turns: ${session.record}`);
    console.log(session);
  };

  const handleSign = async () => {
    // setUid(inputVal);
    if (uid === -1) {
      console.log(uid);
      navigate("/");
    }
    if (
      !playerAddress ||
      !join_instruction ||
      !join_instruction.playerOne ||
      !join_instruction.playerTwo
    ) {
      console.log(playerAddress, join_instruction);
      navigate("/");
      return;
    }
    let playerOne = new PublicKey(join_instruction.playerOne);
    let playerTwo = new PublicKey(join_instruction.playerTwo);
    let program = new anchor.Program(idl as Roullete, provider);
    let sessionAddress = getSessionAddress(playerOne, playerTwo, program, uid);

    try {
      if (isPlayerOne) {
        await program.methods
          .joinSession(new anchor.BN(uid), playerOne, playerTwo)
          .accounts({
            playerOne: playerOne,
            playerTwo: playerTwo,
          })
          .rpc();
      }

      await program.methods
        .transferBet(new anchor.BN(uid))
        .accounts({ playerOne, playerTwo, player: playerAddress })
        .rpc();

      await checkGameStats(program, sessionAddress);
    } catch (e) {
      console.log(e);
    }

    // const reconnectWebSocket = () => {
    //   if (!playerAddress || !uid) {
    //     console.log(playerAddress, uid);
    //     return;
    //   }
    //   const newWs = new WebSocket(
    //     `${
    //       process.env.REACT_APP_BACKEND_URL
    //     }/start/${playerAddress?.toBase58()}/${uid.toString()}`
    //   );

    //   newWs.onclose = () => {
    //     console.log("WebSocket closed after reconnection");
    //   };

    //   newWs.onopen = () => {
    //     console.log("Reconnected to WebSocket, sending READY message");
    //     const ready_message: Action = {
    //       action: "QueueUpdate",
    //       sender_address: playerAddress?.toBase58(),
    //       content: `${isPlayerOne ? "playerOne" : "playerTwo"} is ready!!`,
    //       passcode: process.env.REACT_APP_PASSCODE ?? "",
    //       status: "READY",
    //     };
    //     newWs.send(JSON.stringify(ready_message));
    //     newWs.close(
    //       1000,
    //       `${isPlayerOne ? "playerOne" : "playerTwo"} moving to board`
    //     );
    //     console.log("READY message sent successfully");
    //   };

    //   newWs.onerror = (error) => {
    //     console.error("WebSocket error during reconnection:", error);
    //   };
    // };
    // reconnectWebSocket();

    // ----------------------------------------------------------
    // const ready_message: Action = {
    //   action: "QueueUpdate",
    //   sender_address: playerAddress?.toBase58(),
    //   content: `${isPlayerOne ? "playerOne" : "playerTwo"} is ready!!`,
    //   passcode: process.env.REACT_APP_PASSCODE ?? "",
    //   status: "READY",
    // };
    //-------------------------------------------------------------
    if (isPlayerOne) {
      let ready_message: GoQueueAction = {
        sender_address: playerAddress.toBase58(),
        status: "READY",
        content: join_instruction.uid.toString(),
      };
      sock.send(JSON.stringify(ready_message));
      sock.close(
        1000,
        `${isPlayerOne ? "playerOne" : "playerTwo"} moving to board`
      );
    }
    navigate("/board");
  };
  return (
    <div className="flex flex-row h-96 bg-secondary rounded-lg shadow-2xl">
      <div className="w-3/4 ">
        <img
          src="/assets/transaction.jpeg"
          alt=""
          className="rounded-l-lg h-full"
        ></img>
      </div>
      <div className="flex flex-col p-3 justify-center items-center w-full gap-5">
        <p className="font-heading font-extrabold text-red-600 text-3xl md:text-4xl tracking-wide">
          MATCH FOUND
        </p>
        <button
          onClick={handleSign}
          className="bg-gradient-to-r from-blue-500 to-blue-700 text-white font-base font-semibold text-center py-3 px-6 rounded-full hover:scale-105 transition-transform"
        >
          Seal your fate!
        </button>
      </div>
    </div>
  );
}

export default SignCard;
