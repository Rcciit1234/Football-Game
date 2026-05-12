#!/bin/bash
echo "Starting VoltGoal..."
echo "  Server: http://localhost:3001"
echo "  Client: http://localhost:5173"
echo ""

# Start server in background
npx tsx server/src/index.ts &
SERVER_PID=$!

# Start client
npx vite --host &
CLIENT_PID=$!

# Handle shutdown
trap "kill $SERVER_PID $CLIENT_PID 2>/dev/null; exit" INT TERM

echo "Press Ctrl+C to stop both servers"
wait
