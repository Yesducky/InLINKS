import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowBack } from "@mui/icons-material";

const BackButton = ({ to, className = "", ...props }) => {
  const navigate = useNavigate();

  const handleBack = () => {
    if (to) {
      navigate(to);
    } else {
      navigate(-1); // Go back to previous page
    }
  };

  return (
    <div className={`fixed bottom-6 left-6 ${className}`}>
      <button
        onClick={handleBack}
        className="flex items-center justify-center rounded-full border border-gray-100 bg-white p-4 shadow-lg transition-all duration-200 hover:scale-105 hover:shadow-xl"
        {...props}
      >
        <ArrowBack className="h-6 w-6 text-gray-700" />
      </button>
    </div>
  );
};

export default BackButton;
