# Bastilla_10 → AI System Linux: REST API (bez MCP)

Integracja jest opcjonalna i nie zmienia dotychczasowego modelu czatu Bastilla_10.
Nie przenosi oryginalnych tożsamości ani pamięci agentów.

## AI Linux

W repozytorium `Rush47/AI_System_Linux` ustaw lokalnie w `.env`:

```dotenv
AGENT_API_TOKEN=<losowy-sekret>
AGENT_MODEL=thox-ai/thoxopen-8b-heretic:q4_k_m
```

Wygeneruj sekret przez `openssl rand -hex 32`. Uruchom z katalogu
głównego AI Linux:

```bash
docker compose -f docker-compose.yml -f docker-compose.bastilla-agents.yml up -d --build
```

Usługa nasłuchuje na `127.0.0.1:8091` hosta AI Linux. W przypadku
oddzielnych hostów potrzebne jest prywatne połączenie sieciowe, np. tunel
SSH lub reverse proxy z TLS. Nie udostępniaj portu publicznie.

## Bastilla_10

W prywatnym środowisku backendu Bastilla_10 ustaw:

```dotenv
AI_LINUX_AGENT_URL=http://127.0.0.1:8091
AI_LINUX_AGENT_TOKEN=<ten-sam-sekret-co-AGENT_API_TOKEN>
BASTILLA_BRIDGE_ACCESS_KEY=<inny-losowy-sekret>
```

Adres localhost działa wyłącznie, gdy oba serwery korzystają z tego samego
hosta lub odpowiedniego tunelu. Nie zapisuj sekretów w repozytorium.

Po restarcie backendu dostępne są:

- `GET /api/agent-bridge/agents`
- `POST /api/agent-bridge/tasks` — JSON `{"agent":"Aria","description":"..."}`
- `GET /api/agent-bridge/tasks/{id}`

Każde żądanie wymaga nagłówka `x-agent-bridge-key` z wartością
`BASTILLA_BRIDGE_ACCESS_KEY`. Klucz jest przeznaczony dla zaufanego klienta
serwerowego, nie dla kodu przeglądarki. Nie wpisuj go do frontendowego React.

## Ograniczenia

Nie podłączono jeszcze interfejsu użytkownika Bastilla_10. Adapter AI Linux
wykonuje zadania przez wspólną Ollamę; etykiety Aria/Alex/Astyria/Aurelius
nie oznaczają uwierzytelnionych oryginalnych instancji. Zadania są w pamięci
procesu i nie przetrwają restartu. Nie przeprowadzono testu end-to-end
na uruchomionych serwerach.
