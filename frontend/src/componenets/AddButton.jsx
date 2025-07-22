import React from "react";
import { Add } from "@mui/icons-material";

const AddButton = ({ action }) => {
  return (
    <div className={`fixed right-6 bottom-6`}>
      <button
        onClick={action}
        className="shadow-blue/50 flex items-center justify-center rounded-full border border-gray-100 bg-white p-4 shadow-md transition-all duration-200 hover:scale-105"
      >
        <Add className="h-6 w-6 text-gray-700" />
      </button>
    </div>
  );
};

export default AddButton;
