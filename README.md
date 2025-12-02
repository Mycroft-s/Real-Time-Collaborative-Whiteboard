# Real-Time Collaborative Whiteboard

A Java-based networked application that allows multiple users to draw, write, and interact simultaneously on a shared online canvas. Built with Spring Boot, WebSocket, and MySQL for real-time collaborative drawing and communication.

## Features

### Security Features ⭐

**Advanced Salt+Pepper Password Hashing**:
- 🔒 **PBKDF2 Algorithm**: Uses PBKDF2WithHmacSHA256 with 100,000 iterations
- 🧂 **Unique Salt per User**: Each password gets a randomly generated 256-bit salt
- 🌶️ **Application-Level Pepper**: Additional secret key stored in configuration (not in database)
- 🔐 **Username Protection**: Usernames are also hashed using salt+pepper before storage
- ✅ **Zero Plaintext Storage**: Passwords and usernames are never stored in plain text
- 🛡️ **Rainbow Table Resistant**: Unique salts prevent rainbow table attacks
- 🔑 **Database Compromise Protection**: Even if database is compromised, pepper key provides additional security

**Security Implementation**:
- Custom `HashUtil` class implementing PBKDF2 hashing
- Custom `PasswordEncoder` for Spring Security integration
- Original usernames stored separately for display (hashed version used for authentication)

### Core Functionality
- **Real-Time Collaboration**: Multiple users can join the same whiteboard room and view drawing updates in real time
- **Drawing Tools**: 
  - Pen tool with adjustable line width
  - Shapes: Rectangle, Circle, Line
  - Text input with customizable font size
  - Eraser tool
  - Color palette for customizing drawing colors
  - Clear canvas functionality
- **User Presence**: Displays active users with unique identifiers and real-time cursor markers
- **Chat System**: 
  - Real-time chat messaging between users in the same room
  - Chat history persistence - messages are saved and loaded when users join
  - User identification with real usernames
- **Undo/Redo**: Local undo/redo functionality for drawing operations
- **Room Management**: 
  - Create new collaborative rooms
  - Join existing rooms
  - View list of all available rooms
  - Leave room functionality
- **Session Persistence**: 
  - Manual save functionality - users can save current canvas state as snapshot
  - Automatic operation logging - all drawing operations are saved to database
  - Snapshot loading - when users join a room, the latest saved snapshot is loaded first
  - Operation history - subsequent operations after snapshot are applied on top
- **Authentication & Security**:
  - User registration and login
  - **Advanced Password Security**: Salt+Pepper hashing with PBKDF2
    - Each password uses a unique, randomly generated salt (256-bit)
    - Application-level pepper key for additional security layer
    - PBKDF2WithHmacSHA256 algorithm with 100,000 iterations
    - Passwords are never stored in plain text
  - **Username Protection**: Usernames are also hashed using salt+pepper before storage
    - Original usernames stored separately for display purposes
    - Hash-based username lookup for authentication
  - JWT-based authentication with secure token validation
  - Secure WebSocket connections with token validation
  - Custom password encoder supporting salt+pepper verification
  - User session management

## Technologies

- Spring Boot 2.7.14
- WebSocket (STOMP) for real-time communication
- MySQL Database
- Spring Security & JWT for authentication
- **PBKDF2 Password Hashing** (Salt+Pepper security)
- HTML5 Canvas & JavaScript for frontend
- Maven for build management

## Prerequisites

- Java 11 or higher
- Maven 3.6+
- MySQL 8.0+

## Setup Instructions

### Prerequisites Installation

#### 1. Install Java
- Download and install Java 11 or higher from [Oracle](https://www.oracle.com/java/technologies/downloads/) or [OpenJDK](https://openjdk.org/)
- Set `JAVA_HOME` environment variable to your Java installation directory (e.g., `C:\Program Files\Java\jdk-11`)
- Add `%JAVA_HOME%\bin` to your `Path` environment variable
- Verify installation: `java -version`

#### 2. Install Maven
- Download Maven from [Apache Maven](https://maven.apache.org/download.cgi)
- Extract to a directory (e.g., `C:\Program Files\Apache\maven`)
- Set `MAVEN_HOME` environment variable to Maven directory
- Add `%MAVEN_HOME%\bin` to your `Path` environment variable
- Verify installation: `mvn -version`

#### 3. Install MySQL
- Download and install MySQL 8.0+ from [MySQL Downloads](https://dev.mysql.com/downloads/mysql/)
- During installation, set a root password (remember this password)
- Start MySQL service:
  ```bash
  # Windows
  net start MySQL80
  
  # Linux/Mac
  sudo systemctl start mysql
  ```

### Database Setup

1. **Create Database**:
   ```sql
   CREATE DATABASE whiteboard_db;
   ```

2. **Update Database Configuration**:
   Edit `src/main/resources/application.properties`:
   ```properties
   spring.datasource.url=jdbc:mysql://localhost:3306/whiteboard_db?createDatabaseIfNotExist=true&useSSL=false&serverTimezone=UTC
   spring.datasource.username=root
   spring.datasource.password=your_mysql_password
   
   # Security Configuration (Salt+Pepper)
   app.pepper=YourStrongPepperKeyChangeInProduction
   app.username.salt=YourStrongUsernameSaltKeyChangeInProduction
   ```
   - Replace `your_mysql_password` with your MySQL root password
   - **Important**: Change `app.pepper` and `app.username.salt` to strong, random values in production

### Build and Run

1. **Build the project**:
   ```bash
   mvn clean install
   ```

2. **Run the application**:
   ```bash
   mvn spring-boot:run
   ```

3. **Access the application**:
   Open your browser and navigate to:
   ```
   http://localhost:8080
   ```

### Troubleshooting

- **Port 8080 already in use**: Stop the process using port 8080 or change the port in `application.properties`
- **MySQL connection error**: Verify MySQL service is running and credentials are correct
- **Maven not found**: Ensure Maven is in your system PATH
- **Java not found**: Ensure JAVA_HOME is set correctly

## Usage Guide

### Getting Started

1. **Register/Login**:
   - Click "Switch to Register" to create a new account
   - Fill in username, email, and password
   - Or login with existing credentials

2. **Room Management**:
   - **Create Room**: Enter a room name and click "Create Room"
   - **Join Room**: Click on any room from the room list to join
   - **Leave Room**: Click "Leave Room" button to exit current room
   - **Logout**: Click "Logout" to sign out

3. **Drawing**:
   - Select a tool from the toolbar (Pen, Rectangle, Circle, Line, Text, Eraser)
   - Choose a color from the color picker
   - Adjust line width using the slider
   - Click and drag on the canvas to draw
   - Use "Undo" and "Redo" buttons to revert/restore operations
   - Click "Clear" to clear the entire canvas
   - Click "💾 Save" to save current canvas state as a snapshot

4. **Chat**:
   - Type messages in the chat input at the bottom
   - Click "Send" or press Enter to send
   - All users in the same room will see messages in real-time
   - Chat history is automatically loaded when joining a room

5. **Collaboration**:
   - All drawing operations are synchronized in real-time
   - See other users' cursors moving on the canvas
   - View active users list in the sidebar
   - All changes are automatically saved to the database

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
  - Request body: `{ "username": "string", "email": "string", "password": "string" }`
  - Response: `{ "token": "jwt_token", "username": "string" }`

- `POST /api/auth/login` - Login user
  - Request body: `{ "username": "string", "password": "string" }`
  - Response: `{ "token": "jwt_token", "username": "string" }`

### Room Management
- `POST /api/rooms/create` - Create a new room
  - Headers: `Authorization: Bearer {token}`
  - Request body: `{ "name": "string" }`
  - Response: `{ "roomId": "uuid", "name": "string" }`

- `GET /api/rooms/list` - List all available rooms
  - Headers: `Authorization: Bearer {token}`
  - Response: `[{ "roomId": "uuid", "name": "string", "owner": "string" }]`

- `GET /api/rooms/{roomId}` - Get room details
  - Headers: `Authorization: Bearer {token}`
  - Response: `{ "roomId": "uuid", "name": "string", "owner": "string" }`

- `GET /api/rooms/{roomId}/operations` - Get room operations history
  - Headers: `Authorization: Bearer {token}`
  - Query params: `?afterSequence={number}` (optional)
  - Response: `[{ "type": "string", "data": "json", "sequence": number }]`

- `GET /api/rooms/{roomId}/messages` - Get room chat history
  - Headers: `Authorization: Bearer {token}`
  - Response: `[{ "username": "string", "content": "string", "timestamp": "string" }]`

- `GET /api/rooms/{roomId}/snapshot` - Get latest snapshot
  - Headers: `Authorization: Bearer {token}`
  - Response: `{ "imageData": "base64_string", "createdAt": "timestamp" }`

- `POST /api/rooms/{roomId}/save` - Save current canvas as snapshot
  - Headers: `Authorization: Bearer {token}`
  - Request body: `{ "imageData": "base64_string" }`
  - Response: `{ "success": true, "message": "Snapshot saved successfully" }`

## WebSocket Endpoints

### Connection
- `/ws?token={jwt_token}` - WebSocket connection endpoint (SockJS)
  - Pass JWT token as query parameter for authentication

### Client to Server (Send)
- `/app/draw` - Send drawing operations
  - Message: `{ "roomId": "string", "type": "string", "data": "json", "username": "string" }`
  
- `/app/join` - Join a room
  - Message: `{ "roomId": "string" }`
  
- `/app/leave` - Leave a room
  - Message: `{ "roomId": "string" }`
  
- `/app/chat` - Send chat messages
  - Message: `{ "roomId": "string", "content": "string" }`
  
- `/app/cursor` - Send cursor position updates
  - Message: `{ "roomId": "string", "x": number, "y": number }`

### Server to Client (Subscribe)
- `/topic/draw` - Receive drawing operations from other users
  - Message: `{ "roomId": "string", "type": "string", "data": "json", "username": "string" }`
  
- `/topic/chat` - Receive chat messages
  - Message: `{ "roomId": "string", "username": "string", "content": "string" }`
  
- `/topic/cursor` - Receive cursor updates from other users
  - Message: `{ "roomId": "string", "username": "string", "x": number, "y": number }`
  
- `/topic/room/{roomId}/users` - Receive user presence updates
  - Message: `{ "username": "string", "roomId": "string", "users": [{ "username": "string", "userId": number }] }`

## Security Features

### Salt+Pepper Password Hashing

This application implements industry-standard security practices for password storage:

- **Salt**: Each user receives a unique, randomly generated 256-bit salt stored with their account
- **Pepper**: An application-level secret key stored in configuration (not in database)
- **Algorithm**: PBKDF2WithHmacSHA256 with 100,000 iterations
- **Password Storage**: Passwords are hashed using `hash(password + pepper, salt)` before storage
- **Username Protection**: Usernames are also hashed using salt+pepper for additional security

**Security Benefits**:
- Even if two users have the same password, their hashes will be different (unique salts)
- Database compromise doesn't reveal passwords (pepper not stored in DB)
- Resistant to rainbow table attacks
- Slow hashing algorithm prevents brute force attacks

**Configuration**:
The pepper and username salt keys are configured in `application.properties`:
```properties
app.pepper=YourStrongPepperKeyChangeInProduction
app.username.salt=YourStrongUsernameSaltKeyChangeInProduction
```

⚠️ **Production Warning**: Always change these keys to strong, random values before deploying to production!

## Project Structure

```
src/
├── main/
│   ├── java/com/whiteboard/
│   │   ├── config/          # Configuration classes (Security, WebSocket, etc.)
│   │   ├── controller/      # REST and WebSocket controllers
│   │   ├── dto/             # Data Transfer Objects
│   │   ├── model/           # JPA entities (User, Room, etc.)
│   │   ├── repository/      # JPA repositories
│   │   ├── service/         # Business logic
│   │   └── util/            # Utility classes (HashUtil, JwtUtil)
│   └── resources/
│       ├── static/          # Frontend files (HTML, CSS, JS)
│       └── application.properties
└── test/                    # Test files
```

## License

This project is created for educational purposes.

