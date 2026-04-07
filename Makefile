.PHONY: up down

up:
	docker compose -f dev/compose.yml up -d
	k3d cluster create compute --api-port 6550 || true

down:
	docker compose -f dev/compose.yml down
	k3d cluster delete compute
