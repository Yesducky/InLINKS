import { useState } from "react";
import { Person, Lock } from "@mui/icons-material";
import api from "../services/api.js";
import * as CustomIcons from "../componenets/CustomIcons.jsx";
import { backgroundVariants } from "../utils/styles.js";

const Login = ({ onLogin }) => {
  const [credentials, setCredentials] = useState({
    username: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setCredentials((prev) => ({
      ...prev,
      [name]: value,
    }));
    setError(""); // Clear error when user types
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await api.login(credentials);

      if (response.ok) {
        // Store token
        const data = await response.json();
        localStorage.setItem("token", data.access_token);

        // Store complete user data including user_type_id for interface differentiation
        const userData = {
          id: data.user_id,
          username: data.username,
          user_type_id: data.user_type_id,
        };
        localStorage.setItem("user", JSON.stringify(userData));

        // Pass user data to parent component
        onLogin(userData);
      } else {
        setError(data.message || "登錄失敗");
      }
    } catch (err) {
      setError("網絡錯誤，請重試");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="flex min-h-screen items-center justify-center bg-cover bg-center p-10"
      style={backgroundVariants.login}
    >
      <div className={`absolute z-10 h-screen w-screen bg-gray-800/50`}></div>
      <div className="z-20 flex w-full max-w-md flex-col items-center rounded-2xl bg-white/75 py-10 shadow-lg backdrop-blur-xs">
        {/* Centered login_1.png */}
        {/*<img src={login1} alt="login center" className="object-contain" />*/}
        {/* LogoWithNameIcon below */}
        <div className="flex justify-center">
          <img src={CustomIcons.LogoWithName} alt="logo with name" />
        </div>
        {/*Form Section*/}
        <form onSubmit={handleSubmit} className="mt-4 w-full space-y-4 px-12">
          {/* Username Field */}
          <div className="space-y-2">
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Person className="h-5 w-5 text-gray-400" />
              </div>
              <input
                name="username"
                type="text"
                placeholder="請輸入用戶名稱"
                required
                className="focus:ring-blue w-full rounded-xl border border-gray-300 bg-white/30 py-3 pr-4 pl-10 text-gray-900 placeholder-gray-500 transition-all duration-200 focus:border-transparent focus:bg-white/80 focus:ring-2"
                value={credentials.username}
                onChange={handleInputChange}
              />
            </div>
          </div>
          {/* Password Field */}
          <div className="space-y-2">
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                name="password"
                type="password"
                placeholder="請輸入密碼"
                required
                className="focus:ring-blue w-full rounded-xl border border-gray-300 bg-white/30 py-3 pr-4 pl-10 text-gray-900 placeholder-gray-500 transition-all duration-200 focus:border-transparent focus:bg-white/80 focus:ring-2"
                value={credentials.password}
                onChange={handleInputChange}
              />
            </div>
          </div>
          {/* Error Message */}
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-2">
              <p className="text-center text-sm text-red-600">{error}</p>
            </div>
          )}
          {/* Login Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="hover:from-lightblue hover:to-blue bg-blue w-full transform rounded-xl px-4 py-3 font-semibold text-white shadow-lg transition-all duration-200 hover:scale-105 disabled:transform-none disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? (
              <div className="flex items-center justify-center">
                <div className="mr-2 h-5 w-5 animate-spin rounded-full border-b-2 border-white"></div>
                登錄中...
              </div>
            ) : (
              "登錄系統"
            )}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
