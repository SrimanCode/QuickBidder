import { io } from "socket.io-client";

const Socket = io("http://localhost:8080", {
  autoConnect: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});

export default Socket;
