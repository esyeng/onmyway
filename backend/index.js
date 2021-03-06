const express = require("express");
const app = express();
const server = require("http").createServer(app);
const io = require("socket.io").listen(server);
const PORT = process.env.PORT || 5000;

let guestSocket = null;
let hostSocket = null;
let count = 0;
let room = ["room 237"];
const obj = { id: "", room: "" };
io.on("connection", (socket) => {
  count++;
  console.log("-----Backend connected----", count);

  socket.join(room, () => {
    const rooms = Object.keys(socket.rooms);
    const val = Object.values(socket.rooms);
    console.log(rooms); // [ <socket.id>, 'room 237']
    console.log(val); // [ <socket.id>, 'room 237']
  });

  socket.on("joinEvent", (guestLocation, count) => {
    guestSocket = socket;
    if (guestSocket !== null) {
      io.to("room 237").emit("start");
      console.log("Guest wants a host at", guestLocation);
      console.log(guestSocket);
      console.log("*****************");
    }
  });

  socket.on("guestRequest", (routeToHost) => {
    hostSocket = socket;
    console.log("Host wants a guest at ");
    if (guestSocket !== null) {
      io.to("room 237").emit("guestRequest", routeToHost);
      // guestSocket.emit("guestRequest", routeToHost);
      console.log("=======================");
    }
  });

  socket.on("guestAccepts", (guestLocation, count) => {
    console.log("<<<<<<<<<<DRiver Accepted Backend>>>>>>>", guestLocation);
    if (hostSocket !== null) {
      hostSocket.emit("guestAccepts", guestLocation, count);
    }
  });

  socket.on("liveTracking", (guestLocation, count) => {
    console.log("<<<<<<<<<<BACKGROUND DRIVER TRACKING >>>>>>>", guestLocation);
    if (hostSocket !== null) {
      hostSocket.emit("liveTracking", guestLocation, count);
    }
  });

  socket.on("stopSharing", function (room) {
    try {
      console.log("[socket]", "leave room :", room);
      socket.leave(room);
      socket.to(room).emit("user left", socket.id);
    } catch (e) {
      console.log("[error]", "leave room :", e);
      socket.emit("error", "couldnt perform requested action");
    }
  });
});

server.listen(PORT, () => {
  console.log("server started and listening on port " + PORT);
});
