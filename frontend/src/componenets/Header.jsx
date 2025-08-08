import React from "react";
import * as CustomIcons from "../componenets/CustomIcons.jsx";

const Header = ({ title }) => {
  return (
    <div
      className={`shadow-blue flex h-fit w-full items-center ${title === "工作台" ? "justify-center" : "justify-between"} bg-white/75 px-4 py-3 shadow-md backdrop-blur-xs`}
    >
      {title !== "工作台" && (
        <div
          className={`text-blue h-fit w-fit rounded px-3 py-2 text-2xl font-semibold`}
        >
          {title}
        </div>
      )}
      <img
        src={CustomIcons.LogoWithName}
        alt="logo with name"
        className={`h-11 self-center`}
      />
    </div>
  );
};

export default Header;
