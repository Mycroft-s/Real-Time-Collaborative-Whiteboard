let stompClient = null;
let currentRoomId = null;
let currentUser = null;
let token = null;
let canvas, ctx;
let isDrawing = false;
let currentTool = 'pen';
let startX, startY;
let currentPath = [];
let operationHistory = [];
let historyIndex = -1;
let userCursors = {};
let pendingOperations = []; // Queue for operations when WebSocket is not connected

const colors = ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF', '#000000', '#FFFFFF'];

function initCanvas() {
    canvas = document.getElementById('whiteboard');
    if (!canvas) {
        console.error('Canvas not found');
        return;
    }
    ctx = canvas.getContext('2d');
    
    canvas.width = window.innerWidth - 320;
    canvas.height = window.innerHeight - 64;
    
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    const initialImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    operationHistory.push(initialImageData);
    historyIndex = 0;
    
    setupCanvasEvents();
    
    window.addEventListener('resize', () => {
        if (canvas) {
            canvas.width = window.innerWidth - 320;
            canvas.height = window.innerHeight - 64;
            redrawCanvas();
        }
    });
}

function setupCanvasEvents() {
    if (!canvas) return;
    
    canvas.addEventListener('mousedown', (e) => {
        if (!currentRoomId) return;
        
        const rect = canvas.getBoundingClientRect();
        startX = e.clientX - rect.left;
        startY = e.clientY - rect.top;
        
        if (currentTool === 'text') {
            const text = prompt('Enter text:');
            if (text && text.trim()) {
                const color = document.getElementById('colorPicker').value;
                const fontSize = parseInt(document.getElementById('lineWidth').value) * 5 || 16;
                drawText(startX, startY, text, color, fontSize);
                sendDrawOperation('text', { x: startX, y: startY, text: text, color, fontSize });
            }
            return;
        }
        
        isDrawing = true;
        
        if (currentTool === 'pen' || currentTool === 'eraser') {
            currentPath = [{ x: startX, y: startY }];
        }
    });

    canvas.addEventListener('mousemove', (e) => {
        if (!currentRoomId) return;
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        if (stompClient && stompClient.connected && currentRoomId) {
            stompClient.send('/app/cursor', {}, JSON.stringify({
                roomId: currentRoomId,
                x: x,
                y: y
            }));
        }
        
        if (isDrawing) {
            if (currentTool === 'pen' || currentTool === 'eraser') {
                currentPath.push({ x, y });
                const points = [{ x: startX, y: startY }, { x, y }];
                const color = document.getElementById('colorPicker').value;
                const lineWidth = parseInt(document.getElementById('lineWidth').value);
                drawPath(points, color, lineWidth, currentTool === 'eraser');
                startX = x;
                startY = y;
            }
        }
    });

    canvas.addEventListener('mouseup', (e) => {
        if (!currentRoomId) return;
        if (isDrawing) {
            const rect = canvas.getBoundingClientRect();
            const endX = e.clientX - rect.left;
            const endY = e.clientY - rect.top;
            const color = document.getElementById('colorPicker').value;
            const lineWidth = parseInt(document.getElementById('lineWidth').value);
            
            switch(currentTool) {
                case 'pen':
                case 'eraser':
                    if (currentPath && currentPath.length > 0) {
                        currentPath.push({ x: endX, y: endY });
                        if (currentPath.length >= 2) {
                            sendDrawOperation(currentTool, { points: currentPath, color, lineWidth });
                        }
                        currentPath = [];
                    }
                    break;
                case 'rectangle':
                    const width = endX - startX;
                    const height = endY - startY;
                    if (Math.abs(width) > 1 || Math.abs(height) > 1) {
                        drawRectangle(startX, startY, width, height, color, lineWidth);
                        sendDrawOperation('rectangle', { x: startX, y: startY, width, height, color, lineWidth });
                    }
                    break;
                case 'circle':
                    const radius = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
                    if (radius > 1) {
                        drawCircle(startX, startY, radius, color, lineWidth);
                        sendDrawOperation('circle', { x: startX, y: startY, radius, color, lineWidth });
                    }
                    break;
                case 'line':
                    const distance = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2));
                    if (distance > 1) {
                        drawLine(startX, startY, endX, endY, color, lineWidth);
                        sendDrawOperation('line', { x1: startX, y1: startY, x2: endX, y2: endY, color, lineWidth });
                    }
                    break;
            }
            isDrawing = false;
        }
    });
}

function connectWebSocket() {
    if (stompClient && stompClient.connected) {
        console.log('WebSocket already connected, disconnecting first...');
        stompClient.disconnect();
    }
    
    if (!currentRoomId) {
        console.warn('Cannot connect WebSocket: no room ID');
        return;
    }
    
    // Pass token as query parameter (SockJS doesn't support custom headers well)
    const wsUrl = '/ws' + (token ? '?token=' + encodeURIComponent(token) : '');
    const socket = new SockJS(wsUrl);
    stompClient = Stomp.over(socket);
    
    // Also try to pass token in headers (for STOMP protocol)
    const headers = {};
    if (token) {
        headers['Authorization'] = 'Bearer ' + token;
    }
    
    stompClient.connect(headers, function(frame) {
        console.log('✅ WebSocket Connected: ' + frame);
        
        // Subscribe to draw messages
        stompClient.subscribe('/topic/draw', function(message) {
            const drawMsg = JSON.parse(message.body);
            console.log('Received draw message:', drawMsg);
            if (drawMsg.roomId === currentRoomId) {
                if (drawMsg.username !== currentUser) {
                    applyDrawOperation(drawMsg);
                } else {
                    console.log('Ignoring own draw message (already applied locally)');
                }
            }
        });
        
        // Subscribe to chat messages
        stompClient.subscribe('/topic/chat', function(message) {
            const chatMsg = JSON.parse(message.body);
            console.log('Received chat message:', chatMsg, 'Current user:', currentUser);
            if (chatMsg.roomId === currentRoomId) {
                // Only add message if it's not from current user (already added optimistically)
                if (chatMsg.username && chatMsg.username !== currentUser) {
                    console.log('Adding chat message from other user:', chatMsg.username);
                    addChatMessage(chatMsg.username, chatMsg.content);
                } else if (!chatMsg.username) {
                    console.warn('Received message without username, skipping');
                } else {
                    console.log('Skipping own message (already displayed)');
                }
            } else {
                console.log('Message for different room:', chatMsg.roomId, 'current:', currentRoomId);
            }
        });
        
        // Subscribe to cursor updates
        stompClient.subscribe('/topic/cursor', function(message) {
            const cursorMsg = JSON.parse(message.body);
            if (cursorMsg.roomId === currentRoomId && cursorMsg.username && cursorMsg.username !== currentUser && cursorMsg.username !== 'null') {
                updateCursor(cursorMsg.username, cursorMsg.x, cursorMsg.y);
            }
        });
        
        // Subscribe to room user updates
        if (currentRoomId) {
            stompClient.subscribe('/topic/room/' + currentRoomId + '/users', function(message) {
                const userMsg = JSON.parse(message.body);
                updateUsersList(userMsg.users);
            });
            
            // Send join message after subscription
            setTimeout(() => {
                if (stompClient && stompClient.connected && currentRoomId) {
                    try {
                        stompClient.send('/app/join', {}, JSON.stringify({ roomId: currentRoomId }));
                        console.log('✅ Join message sent for room:', currentRoomId);
                        
                        // Flush any pending operations after join
                        setTimeout(() => {
                            flushPendingOperations();
                        }, 200);
                    } catch (error) {
                        console.error('❌ Error sending join message:', error);
                    }
                }
            }, 100);
        }
    }, function(error) {
        console.error('WebSocket connection error:', error);
        // Retry connection after 2 seconds
        setTimeout(() => {
            if (currentRoomId) {
                console.log('Retrying WebSocket connection...');
                connectWebSocket();
            }
        }, 2000);
    });
}

function login(username, password, isRegister, email) {
    if (!username || !password) {
        const errorDiv = document.getElementById('authError');
        if (errorDiv) {
            errorDiv.textContent = 'Please enter username and password';
        }
        return;
    }
    
    const errorDiv = document.getElementById('authError');
    if (errorDiv) {
        errorDiv.textContent = '';
    }
    
    const url = isRegister ? '/api/auth/register' : '/api/auth/login';
    const body = isRegister ? { username, password, email } : { username, password };
    
    console.log('Attempting to', isRegister ? 'register' : 'login', 'as:', username);
    
    fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
    })
    .then(response => {
        if (!response.ok) {
            return response.text().then(text => {
                throw new Error(text || 'Request failed');
            });
        }
        return response.json();
    })
    .then(data => {
        console.log('Auth response:', data);
        if (data.token) {
            token = data.token;
            currentUser = data.username;
            console.log('Login successful, token received');
            
            // Save token to localStorage
            localStorage.setItem('whiteboard_token', token);
            localStorage.setItem('whiteboard_user', currentUser);
            
            const loginModal = document.getElementById('loginModal');
            if (loginModal) {
                loginModal.style.display = 'none';
            }
            showRoomModal();
        } else {
            if (errorDiv) {
                errorDiv.textContent = data.message || data || 'Authentication failed';
            }
        }
    })
    .catch(error => {
        console.error('Login error:', error);
        if (errorDiv) {
            errorDiv.textContent = 'Error: ' + error.message;
        }
    });
}

function showRoomModal() {
    console.log('Showing room modal');
    const roomModal = document.getElementById('roomModal');
    if (roomModal) {
        roomModal.style.display = 'flex';
    }
    const userDisplay = document.getElementById('currentUserDisplay');
    if (userDisplay && currentUser) {
        userDisplay.textContent = currentUser;
    }
    loadRoomList();
}

function logout() {
    console.log('Logging out...');
    token = null;
    currentUser = null;
    currentRoomId = null;
    localStorage.removeItem('whiteboard_token');
    localStorage.removeItem('whiteboard_user');
    
    if (stompClient && stompClient.connected) {
        stompClient.disconnect();
    }
    
    const roomModal = document.getElementById('roomModal');
    const app = document.getElementById('app');
    const loginModal = document.getElementById('loginModal');
    
    if (roomModal) roomModal.style.display = 'none';
    if (app) app.style.display = 'none';
    if (loginModal) {
        loginModal.style.display = 'flex';
        document.getElementById('username').value = '';
        document.getElementById('password').value = '';
        document.getElementById('email').value = '';
        document.getElementById('authError').textContent = '';
    }
    
    console.log('Logged out successfully');
}

function handleLeaveRoom() {
    console.log('handleLeaveRoom called');
    const roomIdToLeave = currentRoomId;
    
    // Flush any pending operations before leaving
    if (pendingOperations.length > 0) {
        console.log(`Flushing ${pendingOperations.length} pending operations before leaving room...`);
        flushPendingOperations();
        // Wait a bit for operations to be sent
        setTimeout(() => {
            doLeaveRoom(roomIdToLeave);
        }, 500);
    } else {
        doLeaveRoom(roomIdToLeave);
    }
}

function doLeaveRoom(roomIdToLeave) {
    // Send leave message if connected
    if (stompClient && stompClient.connected && roomIdToLeave) {
        try {
            stompClient.send('/app/leave', {}, JSON.stringify({ roomId: roomIdToLeave }));
            console.log('✅ Leave message sent for room:', roomIdToLeave);
        } catch (error) {
            console.error('❌ Error sending leave message:', error);
        }
    }
    
    // Disconnect WebSocket
    if (stompClient && stompClient.connected) {
        stompClient.disconnect();
    }
    
    // Clear room state
    currentRoomId = null;
    userCursors = {};
    pendingOperations = [];
    
    // Hide app and show room modal
    const app = document.getElementById('app');
    if (app) {
        app.style.display = 'none';
    }
    
    // Clear canvas cursors
    const cursorsContainer = document.getElementById('cursors');
    if (cursorsContainer) {
        cursorsContainer.innerHTML = '';
    }
    
    showRoomModal();
}

function handleLogout() {
    console.log('handleLogout called');
    logout();
}

function handleLogoutFromApp() {
    console.log('handleLogoutFromApp called');
    if (stompClient && stompClient.connected && currentRoomId) {
        try {
            stompClient.send('/app/leave', {}, JSON.stringify({ roomId: currentRoomId }));
            console.log('Leave message sent before logout');
        } catch (error) {
            console.error('Error sending leave message:', error);
        }
        stompClient.disconnect();
    }
    logout();
}

function createRoom(name) {
    if (!token) {
        alert('Please login first');
        return;
    }
    
    fetch('/api/rooms/create', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify({ name })
    })
    .then(response => {
        if (!response.ok) {
            return response.text().then(text => {
                throw new Error(text || 'Failed to create room');
            });
        }
        return response.json();
    })
    .then(data => {
        if (data.roomId) {
            joinRoom(data.roomId);
        } else {
            alert('Failed to create room');
        }
    })
    .catch(error => {
        console.error('Error creating room:', error);
        alert('Error: ' + error.message);
    });
}

function joinRoom(roomId) {
    console.log('Joining room:', roomId);
    
    // Disconnect existing WebSocket if any
    if (stompClient && stompClient.connected) {
        stompClient.disconnect();
    }
    
    // Clear previous room state
    currentRoomId = null;
    userCursors = {};
    
    // Set new room ID
    currentRoomId = roomId;
    
    // Hide room modal and show app
    const roomModal = document.getElementById('roomModal');
    const app = document.getElementById('app');
    if (roomModal) roomModal.style.display = 'none';
    if (app) app.style.display = 'block';
    
    // Initialize canvas if needed
    if (!canvas) {
        initCanvas();
    }
    
    // Clear canvas and history
    clearCanvas();
    operationHistory = [];
    historyIndex = -1;
    
    // First, load the latest snapshot
    fetch('/api/rooms/' + roomId + '/snapshot', {
        headers: { 'Authorization': 'Bearer ' + token }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to load snapshot');
        }
        return response.json();
    })
    .then(snapshotData => {
        // If snapshot exists, load it first
        if (snapshotData.imageData && snapshotData.imageData.trim() !== '') {
            console.log('Loading snapshot for room');
            const img = new Image();
            img.onload = function() {
                ctx.drawImage(img, 0, 0);
                // Initialize history with snapshot
                const snapshotImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                operationHistory.push(snapshotImageData);
                historyIndex = 0;
                console.log('Snapshot loaded successfully');
                
                // Load all operations (they will be applied on top of the snapshot)
                // This allows users to continue drawing on the saved state
                loadOperationsAfterSnapshot(roomId, 0);
            };
            img.onerror = function() {
                console.error('Error loading snapshot image');
                // If snapshot fails, load all operations
                loadOperationsAfterSnapshot(roomId, 0);
            };
            img.src = snapshotData.imageData;
        } else {
            console.log('No snapshot found, loading all operations');
            // No snapshot, load all operations
            loadOperationsAfterSnapshot(roomId, 0);
        }
    })
    .catch(error => {
        console.error('Error loading snapshot:', error);
        // If snapshot loading fails, try loading all operations
        loadOperationsAfterSnapshot(roomId, 0);
    });
    
    // Connect WebSocket (will send join message automatically)
    connectWebSocket();
    
    // Update UI
    const roomNameDisplay = document.getElementById('roomNameDisplay');
    if (roomNameDisplay) {
        roomNameDisplay.textContent = `📋 ${roomId.substring(0, 8)}...`;
    }
    
    const userInToolbar = document.getElementById('currentUserInToolbar');
    if (userInToolbar && currentUser) {
        userInToolbar.textContent = currentUser;
    }
    
    // Load chat history
    loadChatHistory(roomId);
}

function loadChatHistory(roomId) {
    fetch('/api/rooms/' + roomId + '/messages', {
        headers: { 'Authorization': 'Bearer ' + token }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to load chat messages');
        }
        return response.json();
    })
    .then(messages => {
        const chatMessages = document.getElementById('chatMessages');
        if (chatMessages) {
            chatMessages.innerHTML = '';
            if (messages && messages.length > 0) {
                console.log('Loading', messages.length, 'chat messages');
                messages.forEach(msg => {
                    addChatMessage(msg.username, msg.content);
                });
            } else {
                console.log('No chat messages to load');
            }
        }
    })
    .catch(error => {
        console.error('Error loading chat messages:', error);
    });
}

function loadOperationsAfterSnapshot(roomId, afterSequence) {
    fetch('/api/rooms/' + roomId + '/operations?afterSequence=' + afterSequence, {
        headers: { 'Authorization': 'Bearer ' + token }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to load room operations');
        }
        return response.json();
    })
    .then(operations => {
        // Initialize history if not already done
        if (operationHistory.length === 0) {
            const initialImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            operationHistory.push(initialImageData);
            historyIndex = 0;
        }
        
        if (operations && operations.length > 0) {
            console.log('Loading', operations.length, 'operations after snapshot');
            operations.forEach((op, index) => {
                try {
                    console.log(`Loading operation ${index + 1}/${operations.length}:`, op.type);
                    applyDrawOperation({ type: op.type, data: op.data });
                } catch (error) {
                    console.error('Error applying operation:', error, op);
                }
            });
            console.log('All operations loaded and applied');
        } else {
            console.log('No operations to load after snapshot');
        }
    })
    .catch(error => {
        console.error('Error loading operations:', error);
    });
}

function saveSnapshot() {
    if (!currentRoomId) {
        alert('No room selected');
        return;
    }
    
    if (!canvas) {
        alert('Canvas not initialized');
        return;
    }
    
    if (!token) {
        alert('Not authenticated. Please login again.');
        return;
    }
    
    // Convert canvas to base64 image
    const imageData = canvas.toDataURL('image/png');
    const url = '/api/rooms/' + currentRoomId + '/save';
    
    console.log('Saving snapshot for room:', currentRoomId);
    console.log('Request URL:', url);
    console.log('Token exists:', !!token);
    console.log('Image data length:', imageData.length);
    
    fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + token
        },
        body: JSON.stringify({ imageData: imageData })
    })
    .then(response => {
        if (!response.ok) {
            // Try to get error message from response
            return response.text().then(text => {
                let errorMsg = 'Failed to save snapshot';
                try {
                    const data = JSON.parse(text);
                    errorMsg = data.error || data.message || errorMsg;
                } catch (e) {
                    // If not JSON, use status text
                    errorMsg = response.statusText || text || errorMsg;
                }
                throw new Error(errorMsg + ' (Status: ' + response.status + ')');
            });
        }
        return response.json();
    })
    .then(data => {
        console.log('Snapshot saved successfully');
        alert('✅ Saved successfully! All users will see this state when they enter the room.');
    })
    .catch(error => {
        console.error('Error saving snapshot:', error);
        alert('❌ Failed to save: ' + error.message);
    });
}

function loadRoomList() {
    if (!token) {
        return;
    }
    
    fetch('/api/rooms/list', {
        headers: { 'Authorization': 'Bearer ' + token }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error('Failed to load rooms');
        }
        return response.json();
    })
    .then(rooms => {
        const roomList = document.getElementById('roomList');
        roomList.innerHTML = '<h3>Available Rooms</h3>';
        if (rooms && rooms.length > 0) {
            rooms.forEach(room => {
                const roomItem = document.createElement('div');
                roomItem.className = 'room-item';
                const title = document.createElement('div');
                title.className = 'room-item-title';
                title.textContent = room.name;
                const owner = document.createElement('div');
                owner.className = 'room-item-owner';
                owner.textContent = 'by ' + room.owner;
                roomItem.appendChild(title);
                roomItem.appendChild(owner);
                roomItem.onclick = () => joinRoom(room.roomId);
                roomList.appendChild(roomItem);
            });
        } else {
            roomList.innerHTML += '<p>No rooms available. Create one!</p>';
        }
    })
    .catch(error => {
        console.error('Error loading rooms:', error);
        const roomList = document.getElementById('roomList');
        roomList.innerHTML = '<p>Failed to load rooms</p>';
    });
}

function sendDrawOperation(type, data) {
    if (!currentRoomId) {
        console.error('No room ID, cannot send operation');
        return;
    }
    
    const message = {
        roomId: currentRoomId,
        type: type,
        data: JSON.stringify(data),
        username: currentUser
    };
    
    console.log('Attempting to send draw operation:', type, 'Room:', currentRoomId, 'WebSocket connected:', !!(stompClient && stompClient.connected));
    
    if (!stompClient || !stompClient.connected) {
        console.warn('WebSocket not connected, adding to pending queue. Type:', type);
        // Add to pending queue
        pendingOperations.push(message);
        saveToHistory();
        return;
    }
    
    try {
        stompClient.send('/app/draw', {}, JSON.stringify(message));
        console.log('✅ Draw operation sent successfully:', type);
        saveToHistory();
    } catch (error) {
        console.error('❌ Error sending draw operation:', error);
        // Add to pending queue if send fails
        pendingOperations.push(message);
        saveToHistory();
    }
}

function flushPendingOperations() {
    if (pendingOperations.length === 0) {
        return;
    }
    
    if (!stompClient || !stompClient.connected) {
        console.warn('Cannot flush pending operations: WebSocket not connected');
        return;
    }
    
    console.log(`Flushing ${pendingOperations.length} pending operations...`);
    const operationsToSend = [...pendingOperations];
    pendingOperations = [];
    
    operationsToSend.forEach((message, index) => {
        try {
            stompClient.send('/app/draw', {}, JSON.stringify(message));
            console.log(`✅ Sent pending operation ${index + 1}/${operationsToSend.length}:`, message.type);
        } catch (error) {
            console.error(`❌ Error sending pending operation ${index + 1}:`, error);
            // Re-add to queue if send fails
            pendingOperations.push(message);
        }
    });
    
    console.log(`✅ Flushed ${operationsToSend.length - pendingOperations.length} operations`);
}

function applyDrawOperation(drawMsg) {
    try {
        const data = JSON.parse(drawMsg.data);
        const type = drawMsg.type;
        
        console.log('Applying draw operation:', type, data);
        
        switch(type) {
            case 'pen':
            case 'eraser':
                if (data.points && data.points.length > 0) {
                    drawPath(data.points, data.color, data.lineWidth, type === 'eraser');
                }
                break;
            case 'rectangle':
                drawRectangle(data.x, data.y, data.width, data.height, data.color, data.lineWidth);
                break;
            case 'circle':
                drawCircle(data.x, data.y, data.radius, data.color, data.lineWidth);
                break;
            case 'line':
                drawLine(data.x1, data.y1, data.x2, data.y2, data.color, data.lineWidth);
                break;
            case 'text':
                if (data.text) {
                    drawText(data.x, data.y, data.text, data.color, data.fontSize || 16);
                }
                break;
            case 'clear':
                clearCanvas();
                break;
            default:
                console.warn('Unknown operation type:', type);
        }
        saveToHistory();
    } catch (error) {
        console.error('Error applying draw operation:', error, drawMsg);
    }
}

function drawPath(points, color, lineWidth, isEraser) {
    if (!points || points.length < 2) {
        console.warn('Invalid points for drawPath:', points);
        return;
    }
    
    ctx.save();
    ctx.strokeStyle = isEraser ? 'white' : (color || '#000000');
    ctx.lineWidth = lineWidth || 2;
    ctx.globalCompositeOperation = isEraser ? 'destination-out' : 'source-over';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.stroke();
    ctx.restore();
}

function drawRectangle(x, y, width, height, color, lineWidth) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.strokeRect(x, y, width, height);
    ctx.restore();
}

function drawCircle(x, y, radius, color, lineWidth) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, 2 * Math.PI);
    ctx.stroke();
    ctx.restore();
}

function drawLine(x1, y1, x2, y2, color, lineWidth) {
    ctx.save();
    ctx.strokeStyle = color;
    ctx.lineWidth = lineWidth;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.restore();
}

function drawText(x, y, text, color, fontSize) {
    ctx.save();
    ctx.fillStyle = color;
    ctx.font = fontSize + 'px Arial';
    ctx.fillText(text, x, y);
    ctx.restore();
}

function clearCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function redrawCanvas() {
    if (operationHistory.length > 0 && historyIndex >= 0) {
        const imageData = operationHistory[historyIndex];
        ctx.putImageData(imageData, 0, 0);
    } else {
        clearCanvas();
    }
}

function saveToHistory() {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    operationHistory = operationHistory.slice(0, historyIndex + 1);
    operationHistory.push(imageData);
    historyIndex = operationHistory.length - 1;
}

function undo() {
    if (historyIndex > 0) {
        historyIndex--;
        const imageData = operationHistory[historyIndex];
        ctx.putImageData(imageData, 0, 0);
        console.log('Undo: history index =', historyIndex);
    } else {
        console.log('Cannot undo: already at beginning');
    }
}

function redo() {
    if (historyIndex < operationHistory.length - 1) {
        historyIndex++;
        const imageData = operationHistory[historyIndex];
        ctx.putImageData(imageData, 0, 0);
        console.log('Redo: history index =', historyIndex);
    } else {
        console.log('Cannot redo: already at end');
    }
}

function updateCursor(username, x, y) {
    if (!username || username === 'null' || username === null) {
        return;
    }
    
    if (!userCursors[username]) {
        const cursor = document.createElement('div');
        cursor.className = 'cursor-marker';
        cursor.id = 'cursor-' + username;
        cursor.textContent = username && username.length > 0 ? username[0].toUpperCase() : '?';
        cursor.style.borderColor = colors[username.length % colors.length];
        cursor.style.backgroundColor = colors[username.length % colors.length];
        const cursorsContainer = document.getElementById('cursors');
        if (cursorsContainer) {
            cursorsContainer.appendChild(cursor);
        }
        userCursors[username] = cursor;
    }
    const cursor = userCursors[username];
    if (cursor && canvas) {
        const rect = canvas.getBoundingClientRect();
        cursor.style.left = (rect.left + x) + 'px';
        cursor.style.top = (rect.top + y) + 'px';
    }
}

function updateUsersList(users) {
    const usersList = document.getElementById('usersList');
    usersList.innerHTML = '';
    document.getElementById('userCount').textContent = `👥 ${users.length} user${users.length !== 1 ? 's' : ''}`;
    users.forEach(user => {
        const li = document.createElement('li');
        const avatar = document.createElement('div');
        avatar.className = 'user-avatar';
        avatar.textContent = user.username.charAt(0).toUpperCase();
        const name = document.createElement('span');
        name.textContent = user.username;
        li.appendChild(avatar);
        li.appendChild(name);
        usersList.appendChild(li);
    });
}

function addChatMessage(username, content) {
    // Only skip if username is completely missing (null or empty string)
    // Allow 'anonymous' to be displayed if that's what the backend sends
    if (!username || username === 'null' || username === null || username === '') {
        console.warn('Skipping chat message with missing username');
        return;
    }
    
    const chatMessages = document.getElementById('chatMessages');
    if (!chatMessages) {
        console.error('Chat messages container not found');
        return;
    }
    
    const messageDiv = document.createElement('div');
    messageDiv.className = 'chat-message';
    messageDiv.innerHTML = '<span class="username">' + escapeHtml(username) + ':</span> ' + escapeHtml(content);
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function sendChatMessage() {
    const input = document.getElementById('chatInput');
    const content = input.value.trim();
    
    if (!content) {
        return;
    }
    
    if (!currentRoomId) {
        console.error('No room ID, cannot send chat message');
        return;
    }
    
    if (!stompClient || !stompClient.connected) {
        console.error('WebSocket not connected, cannot send chat message');
        alert('Not connected to room. Please refresh the page.');
        return;
    }
    
    // Display own message immediately (optimistic update)
    addChatMessage(currentUser, content);
    
    try {
        stompClient.send('/app/chat', {}, JSON.stringify({
            roomId: currentRoomId,
            content: content
        }));
        input.value = '';
        console.log('Chat message sent:', content);
    } catch (error) {
        console.error('Error sending chat message:', error);
        alert('Failed to send message. Please try again.');
        // Remove the message if send failed
        const chatMessages = document.getElementById('chatMessages');
        if (chatMessages && chatMessages.lastChild) {
            chatMessages.removeChild(chatMessages.lastChild);
        }
    }
}

function setupEventListeners() {
    console.log('Setting up event listeners...');
    
    const loginBtn = document.getElementById('loginBtn');
    const registerBtn = document.getElementById('registerBtn');
    const switchModeBtn = document.getElementById('switchModeBtn');
    const createRoomBtn = document.getElementById('createRoomBtn');
    const joinRoomBtn = document.getElementById('joinRoomBtn');
    const undoBtn = document.getElementById('undoBtn');
    const redoBtn = document.getElementById('redoBtn');
    const saveBtn = document.getElementById('saveBtn');
    const clearBtn = document.getElementById('clearBtn');
    const sendChatBtn = document.getElementById('sendChatBtn');
    const chatInput = document.getElementById('chatInput');
    const leaveRoomBtn = document.getElementById('leaveRoomBtn');
    const logoutFromAppBtn = document.getElementById('logoutFromAppBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    
    console.log('Buttons found:', {
        loginBtn: !!loginBtn,
        registerBtn: !!registerBtn,
        switchModeBtn: !!switchModeBtn,
        createRoomBtn: !!createRoomBtn,
        joinRoomBtn: !!joinRoomBtn,
        logoutBtn: !!logoutBtn,
        logoutFromAppBtn: !!logoutFromAppBtn
    });
    
    if (loginBtn) {
        loginBtn.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('Login button clicked');
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            if (username && password) {
                login(username, password, false);
            } else {
                document.getElementById('authError').textContent = 'Please enter username and password';
            }
        });
    }
    
    if (registerBtn) {
        registerBtn.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('Register button clicked');
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            const email = document.getElementById('email').value;
            if (username && password) {
                login(username, password, true, email);
            } else {
                document.getElementById('authError').textContent = 'Please enter username and password';
            }
        });
    }
    
    if (switchModeBtn) {
        switchModeBtn.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('Switch mode button clicked');
            const emailInput = document.getElementById('email');
            const registerBtn = document.getElementById('registerBtn');
            const loginBtn = document.getElementById('loginBtn');
            
            if (emailInput && registerBtn && loginBtn) {
                const isRegisterMode = emailInput.style.display !== 'none' && emailInput.style.display !== '';
                
                if (isRegisterMode) {
                    emailInput.style.display = 'none';
                    registerBtn.style.display = 'none';
                    loginBtn.style.display = 'block';
                    switchModeBtn.textContent = 'Switch to Register';
                    console.log('Switched to login mode');
                } else {
                    emailInput.style.display = 'block';
                    registerBtn.style.display = 'block';
                    loginBtn.style.display = 'none';
                    switchModeBtn.textContent = 'Switch to Login';
                    console.log('Switched to register mode');
                }
            }
        });
    }
    
    if (createRoomBtn) {
        createRoomBtn.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('Create room button clicked');
            const name = document.getElementById('roomName').value || 'Room ' + Date.now();
            createRoom(name);
        });
    }
    
    if (joinRoomBtn) {
        joinRoomBtn.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('Join room button clicked');
            const name = document.getElementById('roomName').value;
            if (name) {
                createRoom(name);
            } else {
                loadRoomList();
            }
        });
    }
    
    const toolButtons = document.querySelectorAll('.tool-btn');
    console.log('Tool buttons found:', toolButtons.length);
    toolButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('Tool button clicked:', btn.dataset.tool);
            document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentTool = btn.dataset.tool;
        });
    });
    
    if (undoBtn) {
        undoBtn.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('Undo clicked');
            undo();
        });
    }
    
    if (redoBtn) {
        redoBtn.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('Redo clicked');
            redo();
        });
    }
    
    if (saveBtn) {
        saveBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Save clicked');
            saveSnapshot();
        });
    }
    
    if (clearBtn) {
        clearBtn.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('Clear clicked');
            if (confirm('Clear the entire canvas?')) {
                clearCanvas();
                sendDrawOperation('clear', {});
            }
        });
    }
    
    if (sendChatBtn) {
        sendChatBtn.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('Send chat clicked');
            sendChatMessage();
        });
    }
    
    if (chatInput) {
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                sendChatMessage();
            }
        });
    }
    
    if (leaveRoomBtn) {
        leaveRoomBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Leave room clicked');
            handleLeaveRoom();
        });
    }
    
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Logout clicked');
            handleLogout();
        });
    }
    
    if (logoutFromAppBtn) {
        logoutFromAppBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log('Logout from app clicked');
            handleLogoutFromApp();
        });
    }
    
    console.log('Event listeners setup complete');
}

function initializeApp() {
    console.log('=== Initializing app ===');
    console.log('Document ready state:', document.readyState);
    
    // Ensure correct initial state
    const loginModal = document.getElementById('loginModal');
    const roomModal = document.getElementById('roomModal');
    const app = document.getElementById('app');
    
    if (loginModal) {
        loginModal.style.display = 'flex';
        console.log('✅ Login modal set to display');
    }
    if (roomModal) {
        roomModal.style.display = 'none';
        console.log('✅ Room modal set to hidden');
    }
    if (app) {
        app.style.display = 'none';
        console.log('✅ App set to hidden');
    }
    
    // Check if user is already logged in (check localStorage for token)
    const savedToken = localStorage.getItem('whiteboard_token');
    const savedUser = localStorage.getItem('whiteboard_user');
    
    if (savedToken && savedUser) {
        console.log('Found saved token, checking validity...');
        token = savedToken;
        currentUser = savedUser;
        // Try to validate token by checking rooms list
        fetch('/api/rooms/list', {
            headers: { 'Authorization': 'Bearer ' + token }
        })
        .then(response => {
            if (response.ok) {
                console.log('Token is valid, showing room modal');
                if (loginModal) loginModal.style.display = 'none';
                showRoomModal();
            } else {
                console.log('Token invalid, showing login');
                localStorage.removeItem('whiteboard_token');
                localStorage.removeItem('whiteboard_user');
                if (loginModal) loginModal.style.display = 'flex';
            }
        })
        .catch(() => {
            console.log('Error validating token, showing login');
            if (loginModal) loginModal.style.display = 'flex';
        });
    }
    
    // Check if all required elements exist
    const requiredElements = [
        'loginBtn', 'registerBtn', 'switchModeBtn', 
        'createRoomBtn', 'joinRoomBtn', 'whiteboard'
    ];
    
    requiredElements.forEach(id => {
        const el = document.getElementById(id);
        console.log(`Element ${id}:`, el ? '✅ Found' : '❌ NOT FOUND');
    });
    
    setupEventListeners();
    initCanvas();
    console.log('=== App initialized successfully ===');
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}
