import React from "react";
import { Link } from "react-router-dom";

function GameLostCard() {
  return (
    <div className="flex flex-row bg-slate-900 rounded-lg shadow-2xl">
      <div className="">
        <img
          src="/assets/gameover.jpeg"
          alt=""
          className="rounded-l-lg h-full"
        ></img>
      </div>
      <div className="flex flex-col p-3 justify-center items-center w-full gap-5">
        <p className="font-idea font-bold tracking-wider text-3xl text-red-600">
          YOU LOST
        </p>
        <p className="font-heading font-extrabold text-2xl text-center text-transparent bg-clip-text bg-gradient-to-r from-green-400 via-green-500 to-green-700 tracking-tighter">
          A STRANGE GAME. <br />
          THE ONLY WINNING MOVE IS <br />
          <span className="text-white">NOT TO PLAY.</span>
        </p>
        <Link to="/" className="text-white group">
          [{" "}
          <span className="relative cursor-pointer text-white transition-colors duration-300 group-hover:text-red-500 before:absolute before:-bottom-1 before:left-0 before:w-0 before:h-[2px] before:bg-red-500 before:transition-all before:duration-300 before:ease-in-out group-hover:before:w-full">
            Continue to Homescreen
          </span>{" "}
          ]
        </Link>
      </div>
    </div>
  );
}

export default GameLostCard;
