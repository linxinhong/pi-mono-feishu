#!/usr/bin/env bash

# Pi Claw Docker Sandbox Management Script
# Usage:
#   ./docker.sh create <data-dir>   - Create and start the container
#   ./docker.sh start               - Start the container
#   ./docker.sh stop                - Stop the container
#   ./docker.sh remove              - Remove the container
#   ./docker.sh status              - Check container status
#   ./docker.sh shell               - Open a shell in the container

# 默认容器名称
CONTAINER_NAME="pi-claw-sandbox"
IMAGE="alpine:latest"

# 默认数据目录
DEFAULT_DATA_DIR="$HOME/.pi-claw/workspace"

# 解析参数
while [[ $# -gt 0 ]]; do
  case $1 in
    --container)
      CONTAINER_NAME="$2"
      shift 2
      ;;
    --data-dir)
      DATA_DIR="$2"
      shift 2
      ;;
    create|start|stop|remove|status|shell)
      ACTION="$1"
      shift
      ;;
    *)
      shift
      ;;
  esac
done

case "$ACTION" in
  create)
    if [ -z "$DATA_DIR" ]; then
      DATA_DIR="$DEFAULT_DATA_DIR"
    fi

    echo "Using data directory: $DATA_DIR"

    # 确保数据目录存在
    mkdir -p "$DATA_DIR"
    DATA_DIR=$(cd "$DATA_DIR" && pwd)

    if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
      echo "Container '${CONTAINER_NAME}' already exists. Remove it first with: $0 remove --container ${CONTAINER_NAME}"
      exit 1
    fi

    echo "Creating container '${CONTAINER_NAME}'..."
    echo "  Data dir: ${DATA_DIR} -> /workspace"

    docker run -d \
      --name "$CONTAINER_NAME" \
      -v "${DATA_DIR}:/workspace" \
      "$IMAGE" \
      tail -f /dev/null

    if [ $? -eq 0 ]; then
      echo "Container created and running."
      echo ""
      echo "Run pi-claw with: pi-claw start --sandbox=docker:${CONTAINER_NAME}"
    else
      echo "Failed to create container."
      exit 1
    fi
    ;;

  start)
    echo "Starting container '${CONTAINER_NAME}'..."
    docker start "$CONTAINER_NAME"
    ;;

  stop)
    echo "Stopping container '${CONTAINER_NAME}'..."
    docker stop "$CONTAINER_NAME"
    ;;

  remove)
    echo "Removing container '${CONTAINER_NAME}'..."
    docker rm -f "$CONTAINER_NAME"
    ;;

  status)
    if docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
      echo "Container '${CONTAINER_NAME}' is running."
      docker ps --filter "name=${CONTAINER_NAME}" --format "table {{.ID}}\t{{.Image}}\t{{.Status}}"
    elif docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
      echo "Container '${CONTAINER_NAME}' exists but is not running."
      echo "Start it with: $0 start --container ${CONTAINER_NAME}"
    else
      echo "Container '${CONTAINER_NAME}' does not exist."
      echo "Create it with: $0 create --data-dir <data-dir> --container ${CONTAINER_NAME}"
    fi
    ;;

  shell)
    echo "Opening shell in '${CONTAINER_NAME}'..."
    docker exec -it "$CONTAINER_NAME" /bin/sh
    ;;

  *)
    echo "Pi Claw Docker Sandbox Management"
    echo ""
    echo "Usage: $0 <command> [options]"
    echo ""
    echo "Commands:"
    echo "  create --data-dir <dir>  - Create and start the container"
    echo "  start                    - Start the container"
    echo "  stop                     - Stop the container"
    echo "  remove                   - Remove the container"
    echo "  status                   - Check container status"
    echo "  shell                    - Open a shell in the container"
    echo ""
    echo "Options:"
    echo "  --container <name>       - Container name (default: pi-claw-sandbox)"
    echo "  --data-dir <path>        - Data directory to mount"
    ;;
esac
