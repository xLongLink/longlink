.PHONY: up down

up:
	docker compose up -d
	k3d cluster create compute --api-port 6550 || true

down:
	docker compose down
	k3d cluster delete compute
