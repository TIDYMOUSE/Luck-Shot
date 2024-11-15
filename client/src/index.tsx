import React from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";
import { SolanaWalletProvider } from "./context/walletContext";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { Bounce, ToastContainer } from "react-toastify";
import Board from "./Board";
import "react-toastify/dist/ReactToastify.css";
import * as buffer from "buffer";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { GameContextProvider } from "./context/GameContext";
import Waiting from "./waiting";

//pollyfill
window.Buffer = buffer.Buffer;

const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    errorElement: (
      <div className="text-3xl font-heading font-bold text-red-600 flex justify-center items-center w-screen h-screen">
        404 not found XD
      </div>
    ),
  },
  {
    path: "board",
    element: <Board />,
  },
  {
    path: "finding",
    element: <Waiting />,
  },
]);

const root = createRoot((document.getElementById("root") as HTMLElement)!);
root.render(
  // <React.StrictMode>
  <SolanaWalletProvider>
    <WalletModalProvider>
      <GameContextProvider>
        <ToastContainer
          position="bottom-right"
          autoClose={2000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="light"
          transition={Bounce}
        />
        <RouterProvider router={router} />
      </GameContextProvider>
    </WalletModalProvider>
  </SolanaWalletProvider>
  // </React.StrictMode>
);
