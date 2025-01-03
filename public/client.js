// public/client.js

let localStream;
let peerConnection;
let roomId;
let isInitiator = false;

const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const joinButton = document.getElementById('joinRoomBtn');
const roomInput = document.getElementById('roomId');

const configuration = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
    ]
};

const socket = io();  // Initialize socket.io connection

async function setupMediaStream() {
    try {
        localStream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: true
        });
        localVideo.srcObject = localStream;
        return true;
    } catch (error) {
        console.error('Error accessing media devices:', error);
        alert('Failed to access camera and microphone');
        return false;
    }
}

async function initializeRoomConnection() {
    if (roomInput.value.trim() === '') {
        alert('Please enter a room ID');
        return;
    }
    
    roomId = roomInput.value;
    const success = await setupMediaStream();
    if (success) {
        socket.emit('join-room', roomId);
        joinButton.disabled = true; // Disable the button once clicked
    }
}

async function createPeerConnection() {
    try {
        peerConnection = new RTCPeerConnection(configuration);

        // Add local stream tracks to peer connection
        localStream.getTracks().forEach(track => {
            peerConnection.addTrack(track, localStream);
        });

        // Handle incoming remote stream
        peerConnection.ontrack = event => {
            console.log('Received remote stream');
            if (remoteVideo.srcObject !== event.streams[0]) {
                remoteVideo.srcObject = event.streams[0];
            }
        };

        // Handle ICE candidates
        peerConnection.onicecandidate = event => {
            if (event.candidate) {
                console.log('Sending ICE candidate');
                socket.emit('ice-candidate', event.candidate);
            }
        };

        peerConnection.oniceconnectionstatechange = () => {
            console.log('ICE Connection State:', peerConnection.iceConnectionState);
        };

        return true;
    } catch (error) {
        console.error('Error creating peer connection:', error);
        return false;
    }
}

// Socket event handlers
socket.on('room-created', async () => {
    console.log('Room created - waiting for peer');
    isInitiator = true;
    await createPeerConnection();
});

socket.on('room-joined', async () => {
    console.log('Joined room - creating peer connection');
    await createPeerConnection();
});

socket.on('start-call', async () => {
    console.log('Starting call - creating offer');
    if (!peerConnection) {
        await createPeerConnection();
    }
    try {
        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);
        socket.emit('offer', offer);
    } catch (error) {
        console.error('Error creating offer:', error);
    }
});

socket.on('offer', async (offer) => {
    console.log('Received offer - creating answer');
    if (!peerConnection) {
        await createPeerConnection();
    }
    try {
        await peerConnection.setRemoteDescription(offer);
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        socket.emit('answer', answer);
    } catch (error) {
        console.error('Error handling offer:', error);
    }
});

socket.on('answer', async (answer) => {
    console.log('Received answer');
    try {
        await peerConnection.setRemoteDescription(answer);
    } catch (error) {
        console.error('Error handling answer:', error);
    }
});

socket.on('ice-candidate', async (candidate) => {
    console.log('Received ICE candidate');
    try {
        await peerConnection.addIceCandidate(candidate);
    } catch (error) {
        console.error('Error adding ICE candidate:', error);
    }
});

socket.on('peer-disconnected', () => {
    console.log('Peer disconnected');
    remoteVideo.srcObject = null;
    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }
    joinButton.disabled = false; // Re-enable button for another connection attempt
});

socket.on('room-full', () => {
    alert('Room is full. Please try another room ID.');
    joinButton.disabled = false; // Re-enable button
});

// Event listeners
joinButton.addEventListener('click', initializeRoomConnection);
