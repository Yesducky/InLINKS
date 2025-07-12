import React from "react";

const Header = ({ title }) => {
  return (
    <div
      className={`shadow-blue flex h-fit w-full items-center justify-center bg-white px-4 py-3 shadow-md`}
    >
      <div
        className={`text-blue h-fit w-fit rounded px-3 py-2 text-2xl font-semibold`}
      >
        {title}
      </div>
    </div>
  );
};

export default Header;
