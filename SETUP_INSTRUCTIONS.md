# Setup Instructions - Real-Time Collaborative Whiteboard

This document provides detailed step-by-step instructions for setting up and running the Real-Time Collaborative Whiteboard application.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Database Configuration](#database-configuration)
4. [Application Configuration](#application-configuration)
5. [Building and Running](#building-and-running)
6. [Verification](#verification)
7. [Troubleshooting](#troubleshooting)

## Prerequisites

Before setting up the application, ensure you have the following software installed:

### Required Software

1. **Java Development Kit (JDK) 11 or higher**
   - Download from: [Oracle JDK](https://www.oracle.com/java/technologies/downloads/) or [OpenJDK](https://openjdk.org/)
   - Verify installation:
     ```bash
     java -version
     ```
   - Should display: `java version "11.x.x"` or higher

2. **Apache Maven 3.6 or higher**
   - Download from: [Apache Maven Downloads](https://maven.apache.org/download.cgi)
   - Verify installation:
     ```bash
     mvn -version
     ```
   - Should display Maven version and Java version

3. **MySQL Server 8.0 or higher**
   - Download from: [MySQL Downloads](https://dev.mysql.com/downloads/mysql/)
   - During installation, set a root password (remember this for later)
   - Verify installation:
     ```bash
     mysql --version
     ```

4. **Web Browser**
   - Chrome, Firefox, Edge, or Safari (latest versions recommended)

## Environment Setup

### Windows

#### 1. Set JAVA_HOME

1. Open "System Properties" → "Environment Variables"
2. Under "System variables", click "New"
3. Variable name: `JAVA_HOME`
4. Variable value: Path to your JDK installation (e.g., `C:\Program Files\Java\jdk-11`)
   - **Important**: Do NOT include `\bin` in the path
5. Click "OK"

#### 2. Add Java to PATH

1. In "System variables", find and select "Path"
2. Click "Edit"
3. Click "New" and add: `%JAVA_HOME%\bin`
4. Click "OK" on all dialogs

#### 3. Set MAVEN_HOME

1. Extract Maven to a directory (e.g., `C:\Program Files\Apache\maven`)
2. In "System variables", click "New"
3. Variable name: `MAVEN_HOME`
4. Variable value: Path to Maven directory (e.g., `C:\Program Files\Apache\maven`)
5. Click "OK"

#### 4. Add Maven to PATH

1. In "System variables", find and select "Path"
2. Click "Edit"
3. Click "New" and add: `%MAVEN_HOME%\bin`
4. Click "OK" on all dialogs

#### 5. Refresh Environment Variables

- **Option 1**: Restart your computer
- **Option 2**: Restart your terminal/command prompt
- **Option 3**: In PowerShell, run:
  ```powershell
  $env:JAVA_HOME = "C:\Program Files\Java\jdk-11"
  $env:MAVEN_HOME = "C:\Program Files\Apache\maven"
  $env:Path = "$env:JAVA_HOME\bin;$env:MAVEN_HOME\bin;$env:Path"
  ```

### Linux/macOS

#### 1. Set JAVA_HOME

Add to `~/.bashrc` or `~/.zshrc`:
```bash
export JAVA_HOME=/usr/lib/jvm/java-11-openjdk-amd64  # Adjust path as needed
export PATH=$JAVA_HOME/bin:$PATH
```

#### 2. Set MAVEN_HOME

Add to `~/.bashrc` or `~/.zshrc`:
```bash
export MAVEN_HOME=/opt/maven  # Adjust path as needed
export PATH=$MAVEN_HOME/bin:$PATH
```

#### 3. Apply Changes

```bash
source ~/.bashrc  # or source ~/.zshrc
```

## Database Configuration

### 1. Start MySQL Service

**Windows:**
```bash
net start MySQL80
```

**Linux:**
```bash
sudo systemctl start mysql
```

**macOS:**
```bash
brew services start mysql
```

### 2. Connect to MySQL

```bash
mysql -u root -p
```
Enter your root password when prompted.

### 3. Create Database

```sql
CREATE DATABASE whiteboard_db;
```

### 4. Verify Database Creation

```sql
SHOW DATABASES;
```
You should see `whiteboard_db` in the list.

### 5. Exit MySQL

```sql
EXIT;
```

## Application Configuration

### 1. Navigate to Project Directory

```bash
cd path/to/JavaFinalProject
```

### 2. Configure Database Connection

Edit `src/main/resources/application.properties`:

```properties
# Database Configuration
spring.datasource.url=jdbc:mysql://localhost:3306/whiteboard_db?useSSL=false&serverTimezone=UTC
spring.datasource.username=root
spring.datasource.password=YOUR_MYSQL_PASSWORD
```

**Important**: Replace `YOUR_MYSQL_PASSWORD` with your actual MySQL root password.

### 3. Verify Other Settings

The following settings should already be configured:

```properties
# JWT Configuration
jwt.secret=your-secret-key-change-this-in-production
jwt.expiration=86400000

# JPA Configuration
spring.jpa.hibernate.ddl-auto=update
spring.jpa.show-sql=false
spring.jpa.properties.hibernate.format_sql=true

# Server Configuration
server.port=8080
```

## Building and Running

### 1. Clean Previous Builds (Optional)

```bash
mvn clean
```

### 2. Build the Project

```bash
mvn clean install
```

This will:
- Download all dependencies
- Compile the source code
- Run tests (if any)
- Package the application

**Expected output**: `BUILD SUCCESS`

### 3. Run the Application

```bash
mvn spring-boot:run
```

**Expected output**:
```
  .   ____          _            __ _ _
 /\\ / ___'_ __ _ _(_)_ __  __ _ \ \ \ \
( ( )\___ | '_ | '_| | '_ \/ _` | \ \ \ \
 \\/  ___)| |_)| | | | | || (_| |  ) ) ) )
  '  |____| .__|_| |_|_| |_\__, | / / / /
 =========|_|==============|___/=/_/_/_/
 :: Spring Boot ::        (v2.7.14)

...
Started WhiteboardApplication in X.XXX seconds
```

### 4. Verify Server is Running

The application should be running on `http://localhost:8080`

You can verify by:
- Opening a browser and navigating to `http://localhost:8080`
- Or checking the port:
  ```bash
  # Windows
  netstat -ano | findstr :8080
  
  # Linux/macOS
  netstat -an | grep 8080
  ```

## Verification

### 1. Access the Application

1. Open a web browser
2. Navigate to: `http://localhost:8080`
3. You should see the login/registration interface

### 2. Create a Test Account

1. Click "Switch to Register"
2. Enter:
   - Username: `testuser`
   - Email: `test@example.com`
   - Password: `password123`
3. Click "Register"
4. You should be automatically logged in

### 3. Create a Room

1. Enter a room name (e.g., "Test Room")
2. Click "Create Room"
3. You should see the whiteboard interface

### 4. Test Drawing

1. Select the Pen tool
2. Draw on the canvas
3. Verify the drawing appears

### 5. Test Multi-User (Optional)

1. Open a second browser window (or use incognito/private mode)
2. Register/login with a different account
3. Join the same room
4. Draw in one window and verify it appears in the other

## Troubleshooting

### Issue: "JAVA_HOME is not set"

**Solution:**
- Verify JAVA_HOME is set correctly
- Restart your terminal/command prompt
- On Windows, you may need to restart your computer

### Issue: "mvn: command not found"

**Solution:**
- Verify MAVEN_HOME is set correctly
- Verify Maven bin directory is in PATH
- Restart your terminal

### Issue: "Port 8080 is already in use"

**Solution:**
1. Find the process using port 8080:
   ```bash
   # Windows
   netstat -ano | findstr :8080
   
   # Linux/macOS
   lsof -i :8080
   ```
2. Stop the process:
   ```bash
   # Windows (replace PID with actual process ID)
   taskkill /PID <PID> /F
   
   # Linux/macOS
   kill -9 <PID>
   ```
3. Or change the port in `application.properties`:
   ```properties
   server.port=8081
   ```

### Issue: "MySQL connection error"

**Solutions:**
1. Verify MySQL service is running:
   ```bash
   # Windows
   net start MySQL80
   
   # Linux
   sudo systemctl status mysql
   ```
2. Verify database exists:
   ```sql
   SHOW DATABASES;
   ```
3. Verify credentials in `application.properties`
4. Check MySQL is listening on port 3306:
   ```bash
   # Windows
   netstat -ano | findstr :3306
   
   # Linux/macOS
   netstat -an | grep 3306
   ```

### Issue: "Build failure" or compilation errors

**Solutions:**
1. Clean and rebuild:
   ```bash
   mvn clean install
   ```
2. Check Java version:
   ```bash
   java -version
   ```
   Should be 11 or higher
3. Delete `target` directory and rebuild:
   ```bash
   rm -rf target  # Linux/macOS
   rmdir /s target  # Windows
   mvn clean install
   ```

### Issue: "WebSocket connection failed"

**Solutions:**
1. Verify server is running
2. Check browser console for errors (F12)
3. Verify JWT token is being sent correctly
4. Check firewall settings

### Issue: "Cannot access static resources"

**Solutions:**
1. Clear browser cache (Ctrl+F5)
2. Verify `src/main/resources/static/` contains:
   - `index.html`
   - `app.js`
   - `style.css`
3. Check SecurityConfig allows static resources

## Next Steps

Once the application is running successfully:

1. **Register multiple users** to test collaboration
2. **Create rooms** and test room management
3. **Test drawing tools** and verify real-time synchronization
4. **Test chat functionality** between multiple users
5. **Test save/load functionality** by saving and rejoining rooms

## Additional Resources

- [Spring Boot Documentation](https://spring.io/projects/spring-boot)
- [WebSocket Documentation](https://spring.io/guides/gs/messaging-stomp-websocket/)
- [MySQL Documentation](https://dev.mysql.com/doc/)
- [Maven Documentation](https://maven.apache.org/guides/)

## Support

If you encounter issues not covered in this guide:

1. Check the application logs in the terminal
2. Check browser console (F12) for frontend errors
3. Verify all prerequisites are installed correctly
4. Ensure all environment variables are set properly

---

**Note**: This application is designed for educational purposes. For production use, ensure proper security configurations, use environment variables for sensitive data, and follow security best practices.

