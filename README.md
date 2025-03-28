# Anime Character Chat Application

## Project Structure

This application provides a real-time multilingual AI-powered anime character chat experience with a WhatsApp-inspired interface for both web and mobile devices.

### Key Technologies
- React frontend with TypeScript and Framer Motion
- Express.js backend with role-based authentication
- Real-time WebSocket update mechanism for messaging
- OpenAI and DeepInfra LLM integration
- PostgreSQL database with comprehensive user and subscription tracking
- Responsive mobile and web interfaces
- WhatsApp-style UI components with advanced animations

## Running the Application

### Development Mode
```bash
npm run dev
```
This runs the TypeScript server with hot-reloading enabled.

### Production Mode
There are multiple ways to run the application in production mode:

### Cross-Platform Methods (Recommended)

These methods work on all operating systems (Windows, macOS, Linux):

1. **For development or production:**
```
# On Windows:
node start.js

# On Unix-like systems (Linux, macOS):
node start.js
# OR directly if executable:
./start.js
```

2. **For running the built version:**
```
# On Windows:
node start-dist.js

# On Unix-like systems (Linux, macOS):
node start-dist.js
# OR directly if executable:
./start-dist.js
```

### Platform-Specific Methods

#### On Unix-like systems (Linux, macOS):

1. **Using the start.sh script:**
```bash
./start.sh
```

2. **Directly with Node.js:**
```bash
NODE_ENV=production node index.js
```

#### On Windows:

1. **Using the batch file:**
```
start-windows.bat
```

2. **For the built version:**
```
start-dist-windows.bat
```

The production mode server:
- Serves optimized static assets
- Uses minified client-side code
- Runs database migrations automatically
- Initializes all required database tables
- Sets up necessary services for real-time messaging

### About the Cross-Platform Scripts

The cross-platform scripts (`start.js` and `start-dist.js`) provide several advantages:

- They work on any operating system with Node.js installed
- No need to remember platform-specific commands
- They automatically set the proper environment variables
- Error handling with helpful messages
- Can be run directly on Unix systems or through Node.js on Windows

## Features

- Real-time messaging with WhatsApp-style interface
- Conversation history and user search
- Animated message status indicators (sent, delivered, read)
- User status tracking (online/offline)
- Rate limiting for API requests and socket connections
- JWT-based authentication

## Deployment

The application is configured to run on port 5000 by default, but will use the `PORT` environment variable if set.