#!/bin/sh
# Stop the app. Your data is kept. Run from the project folder: ./stop.sh

cd frontend
docker compose down

cd ../backend
docker compose down
