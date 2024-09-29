import React from "react";

function Board() {
  return (
    <>
      <main className="flex flex-col  h-screen bg-background">
        <section className="relative h-full ">
          <video className="aspect-video " autoPlay loop>
            <source src="/assets/shoot-self-die.mp4" type="video/mp4" />
            Your browser does not support video tag
          </video>
          <div className="border-dashed gap-3 z-10 absolute w-11/12 left-12 rounded-md p-4 bottom-5 flex flex-col bg-primary">
            <div className="font-base text-xl w-full">Your Turn</div>
            <div className="flex w-full gap-3 ">
              <button className=" bg-black text-secondary hover:text-white rounded-xl p-3 font-idea font-semibold">
                SHOOT OPPONENT
              </button>
              <button className=" bg-black text-secondary hover:text-white rounded-xl p-3 font-idea font-semibold">
                SHOOT SELF
              </button>
            </div>
          </div>
          <div className="absolute bg-black w-11/12 h-28 bottom-3 rounded-md left-14 " />
        </section>
      </main>
    </>
  );
}

export default Board;
