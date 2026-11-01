#!/bin/sh
# Start the app in Docker. Run from the project folder: ./start.sh

# Create the settings files (only the first time)
cp -n backend/.env.example backend/.env
cp -n frontend/.env.example frontend/.env

# Backend: database + API, then demo data
cd backend
docker compose up -d --build
docker compose --profile seed run --rm seed

# Frontend: web app
cd ../frontend
docker compose up -d --build

echo "Open http://localhost:5000  (login: admin@falcons.test / ChangeMe123!)"
