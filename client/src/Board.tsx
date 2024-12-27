import { AnchorProvider, BN, Program } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import React, { useEffect, useState } from "react";
import ReactPlayer from "react-player";
import { Roullete } from "./types/contracy";
import {
  AnchorWallet,
  useConnection,
  useWallet,
} from "@solana/wallet-adapter-react";
import { useGameContext } from "./context/GameContext";
import idl from "./Contract/roulette.json";
import { useNavigate } from "react-router-dom";
import { Action, ShootResponse, VideoId } from "./types/support";
import Modal from "./Modal";
import GameWonCard from "./GameWonCard";
import GameLostCard from "./GameLostCard";
// TODO: Send close message, modal, get stamp (maybe show it in final modal)

interface Message {
  type: "system" | "chat" | "action";
  content: string;
}

const checkGameStats = async (
  program: Program<Roullete>,
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

const getSessionAddress = (
  playerOne: PublicKey,
  playerTwo: PublicKey,
  uid: BN,
  program: Program<Roullete>
) => {
  const [sessionAddress] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("session"),
      playerOne.toBuffer(),
      playerTwo.toBuffer(),
      uid.toArrayLike(Buffer, "le", 8),
    ],
    program.programId
  );
  return sessionAddress;
};

function Board() {
  //video
  const [videoUrl, setVideoUrl] = useState<string>(
    "./assets/shoot_self_opp_die.mp4"
  );
  const [playing, setPlaying] = useState<boolean>(true);
  //contract
  const wallet = useWallet();
  const { connection } = useConnection();
  const provider = new AnchorProvider(connection, wallet as AnchorWallet, {
    commitment: "confirmed",
  });
  const navigate = useNavigate();
  const [turn, setTurn] = useState<boolean>(false);
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [connected, setConnected] = useState(false);

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selfWin, setSelfWin] = useState(false);

  const program = new Program(idl as Roullete, provider);
  const { uid, isPlayerOne, playerAddress, join_instruction } =
    useGameContext();

  const gameKey = getSessionAddress(
    new PublicKey(join_instruction?.playerOne ?? ""),
    new PublicKey(join_instruction?.playerTwo ?? ""),
    new BN(uid),
    program
  );

  useEffect(() => {
    if (uid === -1) {
      console.log(uid);
      navigate("/");
    }
    console.log(isPlayerOne);
    if (
      !join_instruction ||
      !join_instruction.playerOne ||
      !join_instruction.playerTwo
    ) {
      console.log(join_instruction);
      navigate("/");
      return;
    }

    // const ws = new WebSocket(
    //   `${
    //     process.env.REACT_APP_BACKEND_URL
    //   }/start/${playerAddress?.toBase58()}/${uid.toString()}`
    // );

    const ws = new WebSocket(
      `${
        process.env.REACT_APP_BACKEND_URL
      }/game/${playerAddress?.toBase58()}/${uid.toString()}`
    );

    ws.onopen = () => {
      console.log("Connected to WebSocket");
      setConnected(true);
      addMessage("system", "Connected to game server");
    };

    ws.onmessage = async (event) => {
      if (!program || !gameKey) {
        console.log(program, gameKey);
        return;
      }
      let data: ShootResponse = JSON.parse(event.data);
      console.log("Received:", data);

      // if (
      //   data.action === "GeneralMessage" &&
      //   data.sender_address &&
      //   data.content
      // ) {
      //   addMessage("chat", `${data.sender_address}: ${data.content}`);
      // } else if (data.action === "ShootInstruction" && data.video_id) {
      //   addMessage(
      //     "action",
      //     `${data.shooter_address} shot ${data.target_address} (${data.video_id})`
      //   );
      // } else
      if (data.shooter && data.target && data.videoId) {
        let literal = `./assets/${data.videoId.toString()}.mp4`;
        setVideoUrl(literal);
        console.log(`Received video id: ${literal}`);
        try {
          let session = await program.account.session.fetch(gameKey);
          if (data.videoId.endsWith("opp_die")) {
            setSelfWin(true);
            openModal();
          } else if (data.videoId.endsWith("self_die")) {
            setSelfWin(false);
            openModal();
          } else if (!data.videoId.includes("opp_opp")) {
            setTurn(!turn);
          }
        } catch {
          addMessage("system", JSON.stringify(data));
        }
      }
    };

    ws.onclose = () => {
      console.log("Disconnected from WebSocket");
      setConnected(false);
      addMessage("system", "Disconnected from game server");
    };

    setSocket(ws);

    return () => {
      ws.close();
    };
  }, []);

  const addMessage = (type: "system" | "chat" | "action", content: string) => {
    setMessages((prev) => [...prev, { type, content }]);
  };

  const sendAction = (action: Action) => {
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(action));
    } else {
      console.error("WebSocket is not connected");
      addMessage("system", "Error: WebSocket is not connected");
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    if (!playerAddress) {
      console.log("no playerAddress");
      return;
    }
    e.preventDefault();
    if (message.trim()) {
      sendAction({
        action: "GeneralMessage",
        sender_address: playerAddress.toBase58(),
        content: message,
        passcode: process.env.REACT_APP_PASSCODE ?? "",
      });
      addMessage(
        "chat",
        `${playerAddress.toBase58().slice(0, 5)}... : ${message}`
      );
      setMessage("");
    }
  };

  const handleShootSelf = async () => {
    if (
      // !turn ||
      !playerAddress ||
      !join_instruction ||
      !join_instruction.playerOne ||
      !join_instruction.playerTwo
    ) {
      console.log(program, gameKey, turn, playerAddress, join_instruction);
      return;
    }
    let playerOne = new PublicKey(join_instruction.playerOne);
    let playerTwo = new PublicKey(join_instruction.playerTwo);

    try {
      let tx = await program.methods
        .shoot(new BN(uid), playerAddress)
        .accounts({
          playerOne: playerOne,
          playerTwo: playerTwo,
          shooter: playerAddress,
        })
        .rpc();

      console.log(tx);
    } catch (error) {
      console.error("Error shooting self:", error);
    }
    let session = await program.account.session.fetch(gameKey);

    // let i;
    // for (i = 0; i < 6; i++) {
    //   if (session.record[i] === 0) {
    //     break;
    //   }
    // }

    // i = i - 1;
    // if (i === -1) {
    //   i = 0;
    // }

    // if (session.load[i]) {
    //   sendAction({
    //     action: "ShootInstruction",
    //     shooter_address: playerAddress.toBase58(),
    //     target_address: playerAddress.toBase58(),
    //     video_id: VideoId.ShootOppOppDie,
    //     passcode: process.env.REACT_APP_PASSCODE ?? "",
    //   });
    //   setVideoUrl("./assets/shoot_self_opp_die.mp4");
    //   setPlaying(false);
    //   setTimeout(() => setPlaying(true), 100);
    //   setSelfWin(!isPlayerOne);
    //   openModal();
    // }

    if (session.state.active) {
      sendAction({
        action: "ShootInstruction",
        shooter_address: playerAddress.toBase58(),
        target_address: playerAddress.toBase58(),
        video_id: VideoId.ShootOppOppClick,
        passcode: process.env.REACT_APP_PASSCODE ?? "",
      });
      setTurn(!turn);
      setVideoUrl("./assets/shoot_self_self_click.mp4");
      setPlaying(false); // Pause the current video if playing
      setTimeout(() => setPlaying(true), 100); // Brief delay to ensure video switches
    } else if (session.state.won) {
      let winner = session.state.won.winner;
      let calc_winner = isPlayerOne ? playerTwo : playerOne;
      if (winner !== calc_winner) {
        // ! handle this
        console.log("GAME ERROR!!!!!");
      }

      sendAction({
        action: "ShootInstruction",
        shooter_address: playerAddress.toBase58(),
        target_address: playerAddress.toBase58(),
        video_id: VideoId.ShootOppOppDie,
        passcode: process.env.REACT_APP_PASSCODE ?? "",
      });

      setVideoUrl("./assets/shoot_self_self_die.mp4");
      setPlaying(false);
      setTimeout(() => setPlaying(true), 100);
      setSelfWin(false);
      setTimeout(() => {}, 8000);
      openModal();
    } else {
      console.log("GAME ERRORR");
    }
    await checkGameStats(program, gameKey);
  };

  const handleShootOpponent = async () => {
    if (
      // (isPlayerOne && turn) ||
      !playerAddress ||
      !join_instruction ||
      !join_instruction.playerOne ||
      !join_instruction.playerTwo
    ) {
      console.log(turn, playerAddress, join_instruction);
      return;
    }
    let playerOne = new PublicKey(join_instruction.playerOne);
    let playerTwo = new PublicKey(join_instruction.playerTwo);

    let opp = isPlayerOne ? playerTwo : playerOne;

    try {
      let tx = await program.methods
        .shoot(new BN(uid), opp)
        .accounts({
          playerOne: playerOne,
          playerTwo: playerTwo,
          shooter: playerAddress,
        })
        .rpc();

      console.log(tx);
    } catch (error) {
      console.error("Error shooting self:", error);
    }

    let session = await program.account.session.fetch(gameKey);
    // let i;
    // for (i = 0; i < 6; i++) {
    //   if (session.record[i] === 0) {
    //     break;
    //   }
    // }
    // i = i - 1;
    // if (i === -1) {
    //   i = 0;
    // }

    // if (session.load[i]) {
    //   sendAction({
    //     action: "ShootInstruction",
    //     shooter_address: playerAddress.toBase58(),
    //     target_address: opp.toBase58(),
    //     video_id: VideoId.ShootOppSelfDie,
    //     passcode: process.env.REACT_APP_PASSCODE ?? "",
    //   });
    //   setVideoUrl("./assets/shoot_self_opp_die.mp4");
    //   setPlaying(false);
    //   setTimeout(() => setPlaying(true), 100);
    //   setSelfWin(isPlayerOne);
    //   openModal();
    // }

    if (session.state.active) {
      sendAction({
        action: "ShootInstruction",
        shooter_address: playerAddress.toBase58(),
        target_address: opp.toBase58(),
        video_id: VideoId.ShootOppSelfClick,
        passcode: process.env.REACT_APP_PASSCODE ?? "",
      });
      setTurn(!turn);
      setVideoUrl("./assets/shoot_self_opp_click.mp4");
      setPlaying(false);
      setTimeout(() => setPlaying(true), 100);
    } else if (session.state.won) {
      let winner = session.state.won.winner;

      if (winner !== playerAddress) {
        // ! handle this
        console.log("GAME ERROR!!!!!");
      }

      sendAction({
        action: "ShootInstruction",
        shooter_address: playerAddress.toBase58(),
        target_address: opp.toBase58(),
        video_id: VideoId.ShootOppSelfDie,
        passcode: process.env.REACT_APP_PASSCODE ?? "",
      });
      setVideoUrl("./assets/shoot_self_opp_die.mp4");
      setPlaying(false);
      setTimeout(() => setPlaying(true), 100);
      setSelfWin(true);
      setTimeout(() => {}, 8000);
      openModal();
    } else {
      console.log("GAME ERROR");
    }

    await checkGameStats(program, gameKey);
  };

  return (
    <main className="flex flex-col h-screen bg-background">
      <div className="relative flex-grow ">
        <div className="absolute inset-0">
          <ReactPlayer
            url={videoUrl}
            loop={false}
            playing={playing}
            width="100%"
            height="100%"
          />
        </div>
      </div>

      <div className="h-32 ">
        <div className="relative h-full">
          <div className="flex gap-2">
            <div className="flex flex-col">
              <div className="h-14 border-2 z-40 absolute right-16 w-[40%] overflow-y-auto p-4 rounded-lg bg-gray-50 border-violet-600">
                {messages.map((msg, index) => (
                  <div
                    key={index}
                    className={` p-2 rounded text-sm font-heading ${
                      msg.type === "system"
                        ? "bg-gray-100 text-gray-600 italic font-semibold"
                        : msg.type === "action"
                        ? "bg-red-50 text-red-600 font-medium"
                        : "bg-white border text-gray-800"
                    }`}
                  >
                    {msg.content}
                  </div>
                ))}
              </div>
              <div className="flex z-40 absolute right-16 bottom-6 w-[40%]  ">
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Type a message..."
                  disabled={!connected}
                  className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!connected}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg font-medium transition-colors hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Send
                </button>
              </div>
            </div>
            <div className="absolute z-10 bottom-5 left-12 w-11/12 flex flex-col gap-3 p-4 rounded-md bg-primary border-dashed">
              <div className="font-base text-xl w-full">Your Turn</div>
              <div className="flex w-full gap-3">
                <button
                  onClick={handleShootOpponent}
                  disabled={!connected}
                  className="bg-black text-secondary hover:text-white rounded-xl p-3 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  SHOOT OPPONENT
                </button>
                <button
                  onClick={handleShootSelf}
                  disabled={!connected}
                  className="bg-black text-secondary hover:text-white rounded-xl p-3 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  SHOOT SELF
                </button>
              </div>
            </div>
          </div>
          <div className="absolute bottom-3 left-14 w-11/12 h-28 bg-black rounded-md" />
        </div>
      </div>
      <Modal isOpen={isModalOpen} onClose={closeModal} title="My Cool Modal">
        {selfWin ? <GameWonCard /> : <GameLostCard />}
      </Modal>
    </main>
  );
}

export default Board;

// WHAT DOESNT KILL YOU MAKES YOU EVEN STRONGER
// It never gets easier. You just get Stronger.

// A STRANGE GAME. THE ONLY WINNING MOVE IS NOT TO PLAY. [START OVER]

// No wonder you can't sleep.
// you won but at what cost?

// Error shooting self:
// Proxy { <target>: Error, <handler>: {…} }
// ​
// <target>: Error: Simulation failed.
// Message: Transaction simulation failed: Error processing Instruction 2: Program arithmetic overflowed.
// Logs:
// [
//   "Program ComputeBudget111111111111111111111111111111 invoke [1]",
//   "Program ComputeBudget111111111111111111111111111111 success",
//   "Program ComputeBudget111111111111111111111111111111 invoke [1]",
//   "Program ComputeBudget111111111111111111111111111111 success",
//   "Program BKRyhQnbYUESjAaS7X2n11nWKmouzBmNkD1XhXwPQ8df invoke [1]",
//   "Program log: Instruction: Shoot",
//   "Program data: d5fPryV6De+JCQQ/RpTuUf/zm6M1aZIsncqNikMTGoGhkvp5c+9RxgwKqHjMcn9g2PFNosJGH+b3HtSWxuOF9Ucy5QTqA7MsiQkEP0aU7lH/85ujNWmSLJ3KjYpDExqBoZL6eXPvUcY=",
//   "Program log: ProgramError occurred. Error Code: ArithmeticOverflow. Error Number: 103079215104. Error Message: Program arithmetic overflowed.",
//   "Program BKRyhQnbYUESjAaS7X2n11nWKmouzBmNkD1XhXwPQ8df consumed 8752 of 199700 compute units",
//   "Program BKRyhQnbYUESjAaS7X2n11nWKmouzBmNkD1XhXwPQ8df failed: Program arithmetic overflowed"
// ].
// Catch the `SendTransactionError` and call `getLogs()` on it for full details.
// ​
// <handler
