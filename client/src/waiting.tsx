import { Player } from "@lottiefiles/react-lottie-player";
import React, { useEffect, useState } from "react";
import Modal from "./Modal";
import SignCard from "./SignCard";
import { useGameContext } from "./context/GameContext";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import {
  GoQueueAction,
  JoinInstruction,
  JoinResponse,
  QueueResponse,
} from "./types/support";
import { toast } from "react-toastify";

// CHECK: isPlayerOne needs to be called twice, socket closing
function Waiting() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [socket, setSocket] = useState<WebSocket | null>(null);

  const openModal = () => setIsModalOpen(true);
  const closeModal = () => setIsModalOpen(false);
  const navigate = useNavigate();
  const { uid, setIsPlayerOne, setJoinInstruction, playerAddress } =
    useGameContext();

  useEffect(() => {
    const join_queue_go = async () => {
      if (!playerAddress) {
        console.log("no public key");
        navigate("/");
        return;
      }

      let ws = new WebSocket(
        `${process.env.REACT_APP_BACKEND_URL}/join/${playerAddress}`
      );

      ws.onopen = () => {
        console.log("Connected to WebSocket");
      };

      ws.onclose = () => {
        console.log("Disconnected from WebSocket");
      };
      ws.onmessage = (event) => {
        let queue_msg: GoQueueAction = JSON.parse(event.data);

        switch (queue_msg.status) {
          case "ADDED":
            console.log(queue_msg.content);
            break;
          case "FOUND":
            setIsPlayerOne(true);
            setJoinInstruction({
              playerOne: playerAddress.toBase58(),
              playerTwo: queue_msg.sender_address,
              uid: Number(queue_msg.content),
            });
            openModal();
            break;
          case "READY":
            setJoinInstruction({
              playerOne: queue_msg.sender_address,
              playerTwo: playerAddress.toBase58(),
              uid: Number(queue_msg.content),
            });
            setIsPlayerOne(false);
            console.log(queue_msg.content);
            openModal();
            break;
          default:
            console.log("random queue msg" + queue_msg.status);
            break;
        }
      };

      setSocket(ws);
    };
    const join_queue = async () => {
      if (!playerAddress) {
        console.log("no public key");
        navigate("/");
        return;
      }

      if (!uid) {
        console.log("no uid");
        navigate("/");
        return;
      }

      try {
        const response = await axios.post(
          `${process.env.REACT_APP_BACKEND_URL}/join`,
          {
            uid: uid,
            user_addr: playerAddress,
            passcode: process.env.REACT_APP_PASSCODE,
          },
          {
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        console.log(response.data);

        const join_response: JoinResponse = response.data;

        if (join_response.status === "ADDED") {
          setIsPlayerOne(true);
        } else if (join_response.status === "FOUND") {
          setIsPlayerOne(false);
        } else if (join_response.status === "QUEUE_FULL") {
          toast.warn("Queue is full!! Please try again later");
          navigate("/");
          return;
        } else {
          toast.error("INTERNAL SERVER ERROR");
          navigate("/");
          return;
        }

        const join_instruction: JoinInstruction = JSON.parse(
          join_response.content
        );
        setJoinInstruction(join_instruction);

        console.log(response, join_instruction);

        return join_instruction;
      } catch (e) {
        console.log(e);
        return null;
      }
    };

    const connectWebSocket = (intrruction: JoinInstruction) => {
      let ws = new WebSocket(
        `${
          process.env.REACT_APP_BACKEND_URL
        }/start/${playerAddress?.toBase58()}/${uid.toString()}`
      );

      ws.onopen = () => {
        console.log("Connected to WebSocket");
      };

      ws.onclose = () => {
        console.log("Disconnected from WebSocket");
      };

      ws.onmessage = (event) => {
        if (!playerAddress) return;
        if (!intrruction || !intrruction.playerOne) {
          console.log(intrruction);
          return;
        }
        const data: QueueResponse = JSON.parse(event.data);
        console.log("Received:", data);

        if (data.sender_address && data.content && data.status === "FOUND") {
          console.log(
            `${data.sender_address}: ${data.content}, Status: ${data.status}`
          );
          let new_instruction = intrruction;
          new_instruction.playerTwo = data.sender_address;
          console.log(new_instruction);
          setJoinInstruction(new_instruction);

          // ws.close(1000, "Resetting socket for player one!");

          openModal();
        } else if (
          data.sender_address &&
          data.content &&
          data.status === "READY"
        ) {
          console.log(
            `${data.sender_address}: ${data.content}, Status: ${data.status}`
          );
          ws.close(1000, "player two moving to board");
          navigate("/board");
        }
      };

      setSocket(ws);

      return ws;
    };

    const init = async () => {
      const instruction = await join_queue();
      if (instruction) {
        connectWebSocket(instruction);
      }
    };

    // init();
    join_queue_go();

    return () => {
      if (socket) {
        socket.close();
      }
    };
  }, []);

  return (
    <main className="w-full h-screen flex flex-col md:flex-row">
      <section className="flex justify-center items-center h-full p-3">
        <img src="/assets/Waiting.gif" alt="" className="size-4/5 w-full" />
      </section>
      <section className="flex flex-col md:h-full justify-center items-center p-3">
        <div className=" mx-auto md:leading-tight text-left text-red-500 font-idea font-medium text-3xl md:text-5xl p-3 tracking-tighter">
          what doesn't <br />
          <span className="bg-red-500 text-white  px-2 font-bold mr-2">
            KILL
          </span>
          you,
          <br /> makes you even
          <br /> <span className="font-bold">STRONGER</span>
        </div>
        <div className="flex items-center h-fit w-full p-3 ">
          <p className="text-md font-medium font-base w-full ">
            Looking for your last friend
          </p>
          <Player
            src="/assets/loader.json"
            autoplay
            loop
            className="size-28 "
          />
        </div>
      </section>
      {/* <button onClick={openModal}>open</button> */}
      {socket && (
        <Modal isOpen={isModalOpen} onClose={closeModal} title="My Cool Modal">
          <SignCard sock={socket} />
        </Modal>
      )}
    </main>
  );
}

export default Waiting;

// TODO: after ply one disconnects, ply two should expect a disconnection via normal from player one
