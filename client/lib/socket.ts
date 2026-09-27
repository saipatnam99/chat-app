
import { io } from "socket.io-client";

const SOCKET_URL =
  process.env.NEXT_PUBLIC_SOCKET_URL ||
  "http://localhost:5001";

const socket = io(SOCKET_URL, {
  autoConnect: false,
//   transports: ["websocket"],
transports: ["websocket", "polling"],
});

export const connectSocket = () => {
  const token = localStorage.getItem("token");

  if (!token) return;

  socket.auth = {
    token,
  };

  if (!socket.connected) {
    socket.connect();
  }
};

export default socket;