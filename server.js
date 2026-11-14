// const express = require('express');
// const http = require('http');
// const { Server } = require('socket.io');

// const app = express();
// const server = http.createServer(app);
// const io = new Server(server);

// app.use(express.static('public'));

// // Store users by room: { roomId: [{ id: socket.id, name: userName }] }
// const rooms = {}; 

// io.on('connection', (socket) => {
//     let currentRoom = null;

//     socket.on('join-room', (roomId, userName) => {
//         socket.join(roomId);
//         currentRoom = roomId;
//         socket.userName = userName; // Attach name to the socket session

//         if (!rooms[roomId]) rooms[roomId] = [];
//         rooms[roomId].push({ id: socket.id, name: userName });

//         // Tell the user they successfully joined
//         socket.emit('room-joined', roomId, socket.id);
        
//         // Broadcast the updated lobby list to everyone in the room
//         io.to(roomId).emit('room-users', rooms[roomId]);
//     });

//     // Targeted Routing: Forward signaling only to the specified recipient
//     socket.on('targeted-offer', (offer, targetId) => {
//         socket.to(targetId).emit('targeted-offer', offer, socket.id, socket.userName);
//     });

//     socket.on('targeted-answer', (answer, targetId) => {
//         socket.to(targetId).emit('targeted-answer', answer, socket.id);
//     });

//     socket.on('targeted-ice-candidate', (candidate, targetId) => {
//         socket.to(targetId).emit('targeted-ice-candidate', candidate, socket.id);
//     });

//     // Handle abrupt disconnections cleanly
//     socket.on('disconnect', () => {
//         if (currentRoom && rooms[currentRoom]) {
//             rooms[currentRoom] = rooms[currentRoom].filter(user => user.id !== socket.id);
//             // Broadcast the updated list minus the disconnected user
//             io.to(currentRoom).emit('room-users', rooms[currentRoom]); 
//         }
//     });
// });

// const PORT = 3000;
// server.listen(PORT, '0.0.0.0', () => {
//     console.log(`Server running on port ${PORT}`);
// });

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

// Store users by room: { roomId: [{ id: socket.id, name: userName }] }
const rooms = {};

function removeFromRoom(socket, roomId) {
    if (!roomId || !rooms[roomId]) return;
    rooms[roomId] = rooms[roomId].filter(user => user.id !== socket.id);
    if (rooms[roomId].length === 0) {
        delete rooms[roomId]; // don't leak empty rooms
    } else {
        io.to(roomId).emit('room-users', rooms[roomId]);
    }
}

io.on('connection', (socket) => {
    let currentRoom = null;

    socket.on('join-room', (roomId, userName) => {
        // If this socket was already in a room, leave it first
        if (currentRoom) {
            socket.leave(currentRoom);
            removeFromRoom(socket, currentRoom);
        }

        socket.join(roomId);
        currentRoom = roomId;
        socket.userName = userName;

        if (!rooms[roomId]) rooms[roomId] = [];
        rooms[roomId].push({ id: socket.id, name: userName });

        socket.emit('room-joined', roomId, socket.id);
        io.to(roomId).emit('room-users', rooms[roomId]);
    });

    // Targeted routing: forward signaling only to the specified recipient
    socket.on('targeted-offer', (offer, targetId) => {
        socket.to(targetId).emit('targeted-offer', offer, socket.id, socket.userName);
    });

    socket.on('targeted-answer', (answer, targetId) => {
        socket.to(targetId).emit('targeted-answer', answer, socket.id);
    });

    socket.on('targeted-ice-candidate', (candidate, targetId) => {
        socket.to(targetId).emit('targeted-ice-candidate', candidate, socket.id);
    });

    socket.on('disconnect', () => {
        removeFromRoom(socket, currentRoom);
    });
});

const PORT = 3000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});