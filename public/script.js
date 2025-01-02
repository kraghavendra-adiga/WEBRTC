const socket = io();

// DOM Elements
const joinRoomBtn = document.getElementById('joinRoomBtn');
const roomIdInput = document.getElementById('roomId');

// Join Room Event Listener
joinRoomBtn.addEventListener('click', () => {
    const roomId = roomIdInput.value;
    if (roomId.trim()) {
        // Trigger room join in client.js
        initializeVideoChat(roomId);
    } else {
        alert('Please enter a Room ID');
    }
});

// Optional: Handle room join via Enter key
roomIdInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        joinRoomBtn.click();
    }
});