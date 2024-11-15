import React from "react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="bg-white rounded-lg shadow-lg max-w-3xl  ">
        <div className="h-full">{children}</div>
      </div>
    </div>
  );
};

export default Modal;

/* <div className="flex justify-end">
          <button
            className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            onClick={onClose}
          >
            Close
          </button>
        </div> */

//     <div className="flex justify-between items-center mb-4">
//     <button
//       className="text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
//       onClick={onClose}
//     >
//       ✖
//     </button>
//   </div>
