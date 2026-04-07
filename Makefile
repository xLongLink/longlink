.PHONY: up down

up:
	docker compose -f dev/compose.yml up -d
	k3d cluster create compute --registry-create compute-registry:0.0.0.0:5000 || true

down:
	docker compose -f dev/compose.yml down
	k3d cluster delete compute
