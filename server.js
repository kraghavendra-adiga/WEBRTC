// server.js
const express = require('express');
const http = require('http');
const path = require('path');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static(path.join(__dirname, 'public')));

const rooms = new Map();

io.on('connection', (socket) => {
    console.log('New user connected:', socket.id);

    socket.on('join-room', (roomId) => {
        console.log(`User ${socket.id} joining room ${roomId}`);
        
        // Join the room
        socket.join(roomId);
        
        // Get number of clients in the room
        const clients = io.sockets.adapter.rooms.get(roomId);
        const numClients = clients ? clients.size : 0;
        
        console.log(`Number of clients in room ${roomId}: ${numClients}`);

        // First peer joins
        if (numClients === 1) {
            socket.emit('room-created');
        }
        // Second peer joins
        else if (numClients === 2) {
            socket.emit('room-joined');
            socket.to(roomId).emit('start-call');
        }
        // Room is full
        else {
            socket.emit('room-full');
            socket.disconnect();
        }

        // Handle signaling
        socket.on('offer', (offer) => {
            console.log('Relaying offer');
            socket.to(roomId).emit('offer', offer);
        });

        socket.on('answer', (answer) => {
            console.log('Relaying answer');
            socket.to(roomId).emit('answer', answer);
        });

        socket.on('ice-candidate', (candidate) => {
            console.log('Relaying ICE candidate');
            socket.to(roomId).emit('ice-candidate', candidate);
        });

        socket.on('disconnect', () => {
            console.log(`User ${socket.id} left room ${roomId}`);
            socket.to(roomId).emit('peer-disconnected');
        });
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});