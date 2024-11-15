import React from "react";
import { Link } from "react-router-dom";

function GameWonCard() {
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
        <div className="flex flex-col justify-center items-center">
          <p className="font-idea font-bold tracking-wide text-3xl text-rose-500">
            YOU WON
          </p>
          <span className="text-xs font-base font-bold text-center bg-gradient-to-r from-purple-500 via-teal-400 to-blue-600 bg-clip-text text-transparent ">
            [ +0.02 SOL!!! ]
          </span>
        </div>
        <p className="font-heading font-extrabold text-2xl text-center tracking-tighter text-teal-300">
          HOW WILL YOU{" "}
          <span className="text-white underline italic">SLEEP</span> TODAY?
        </p>
        <Link to="/" className="text-white group">
          [{" "}
          <span className="relative cursor-pointer text-white transition-colors duration-300 group-hover:text-green-500 before:absolute before:-bottom-1 before:left-0 before:w-0 before:h-[2px] before:bg-green-500 before:transition-all before:duration-300 before:ease-in-out group-hover:before:w-full">
            Continue to Homescreen
          </span>{" "}
          ]
        </Link>
      </div>
    </div>
  );
}

export default GameWonCard;
