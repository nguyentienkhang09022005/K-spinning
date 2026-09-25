docker stop 9router
docker rm 9router
docker build -t 9router .
docker run -d --name 9router -p "${PORT:-26015}:${PORT:-26015}" -e PORT="${PORT:-26015}" --env-file .env -v 9router-data:/app/data 9router