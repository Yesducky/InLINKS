import React from "react";
import { History } from "lucide-react";

const LogButton = ({ setShowLogModal }) => {
  return (
    <>
      <button
        onClick={() => {
          setShowLogModal(true);
        }}
        className="flex items-center gap-2 rounded-xl border border-gray-100 bg-white px-4 py-2 whitespace-nowrap text-gray-600 shadow-sm transition-colors duration-200 hover:bg-gray-50"
      >
        <History className="h-5 w-5" />
        {/*查看日誌*/}
      </button>
    </>
  );
};
export default LogButton;
