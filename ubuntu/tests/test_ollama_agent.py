import unittest
from unittest.mock import AsyncMock, patch
from ubuntu.ollama_agent import chat, OllamaUnavailable

class OllamaAgentTests(unittest.IsolatedAsyncioTestCase):
    async def test_reject_empty_message(self):
        with self.assertRaises(ValueError):
            await chat("   ")

    async def test_real_response_shape_with_mock_transport(self):
        import httpx
        def handler(request):
            self.assertEqual(request.url.path, "/api/chat")
            return httpx.Response(200, json={"model":"test:8b","message":{"content":"Dziala"},"done":True})
        transport = httpx.MockTransport(handler)
        original = httpx.AsyncClient
        def client_factory(*args, **kwargs):
            kwargs["transport"] = transport
            return original(*args, **kwargs)
        with patch("ubuntu.ollama_agent.httpx.AsyncClient", side_effect=client_factory):
            result = await chat("test", "test:8b")
        self.assertEqual(result["agent"], "System")
        self.assertEqual(result["response"], "Dziala")
        self.assertEqual(result["provider"], "ollama")
