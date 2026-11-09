import json
import os
import unittest
from unittest.mock import patch

import httpx

from ubuntu.ollama_agent import STANDARD_OLLAMA_MODEL, chat, OllamaUnavailable


def mocked_client(handler):
    original = httpx.AsyncClient
    transport = httpx.MockTransport(handler)

    def factory(*args, **kwargs):
        kwargs["transport"] = transport
        return original(*args, **kwargs)

    return patch("ubuntu.ollama_agent.httpx.AsyncClient", side_effect=factory)


class OllamaAgentTests(unittest.IsolatedAsyncioTestCase):
    async def test_reject_empty_message(self):
        with self.assertRaises(ValueError):
            await chat("   ")

    async def test_real_response_shape_with_mock_transport(self):
        def handler(request):
            self.assertEqual(request.url.path, "/api/chat")
            self.assertEqual(json.loads(request.content)["model"], STANDARD_OLLAMA_MODEL)
            return httpx.Response(200, json={"model": STANDARD_OLLAMA_MODEL, "message": {"content": "Dziala"}, "done": True})

        with mocked_client(handler):
            result = await chat("test", STANDARD_OLLAMA_MODEL)
        self.assertEqual(result["agent"], "System")
        self.assertEqual(result["response"], "Dziala")
        self.assertEqual(result["provider"], "ollama")
        self.assertEqual(result["model"], STANDARD_OLLAMA_MODEL)

    async def test_stale_environment_and_fallback_do_not_override_standard(self):
        calls = []

        def handler(request):
            calls.append(json.loads(request.content))
            return httpx.Response(200, json={"model": STANDARD_OLLAMA_MODEL, "message": {"content": "OK"}})

        with patch.dict(os.environ, {"OLLAMA_MODEL": "small:latest", "OLLAMA_FALLBACK_MODEL": "gemma4-e4b-ultra-uncensored"}), mocked_client(handler):
            await chat("one")
            await chat("two")
        self.assertEqual([call["model"] for call in calls], [STANDARD_OLLAMA_MODEL, STANDARD_OLLAMA_MODEL])

    async def test_requested_alternative_is_rejected_before_network(self):
        with patch("ubuntu.ollama_agent.httpx.AsyncClient") as client:
            for model in ("small:latest", "dolphin3:8b", "", "auto"):
                with self.assertRaises(ValueError):
                    await chat("test", model)
            client.assert_not_called()

    async def test_standard_failure_is_one_call_without_alternative(self):
        calls = []

        def handler(request):
            calls.append(json.loads(request.content))
            return httpx.Response(404, json={"error": "model not found"})

        with patch.dict(os.environ, {"OLLAMA_MODEL": "small:latest", "OLLAMA_FALLBACK_MODEL": "other:8b"}), mocked_client(handler):
            with self.assertRaisesRegex(OllamaUnavailable, "dolphin-llama3:8b.*no replacement"):
                await chat("test")
        self.assertEqual(len(calls), 1)
        self.assertEqual(calls[0]["model"], STANDARD_OLLAMA_MODEL)

    async def test_different_or_missing_response_model_is_not_accepted(self):
        for returned_model in ("small:latest", "dolphin3:8b", None):
            def handler(request):
                return httpx.Response(200, json={"model": returned_model, "message": {"content": "Wrong model"}})

            with mocked_client(handler):
                with self.assertRaisesRegex(OllamaUnavailable, "did not confirm"):
                    await chat("test")

    async def test_empty_content_is_failure(self):
        for content in (None, "", "   "):
            def handler(request):
                return httpx.Response(200, json={"model": STANDARD_OLLAMA_MODEL, "message": {"content": content}})

            with mocked_client(handler):
                with self.assertRaisesRegex(OllamaUnavailable, "no message content"):
                    await chat("test")

    async def test_api_rejects_override_with_400(self):
        from fastapi import HTTPException
        from ubuntu.api import ChatRequest, system_chat

        with self.assertRaises(HTTPException) as raised:
            await system_chat(ChatRequest(message="test", model="small:latest"))
        self.assertEqual(raised.exception.status_code, 400)

    async def test_diagnostics_require_exact_standard_and_expose_no_fallback(self):
        from ubuntu.api import agents_diagnostics

        for models, expected in ((["small:latest", "dolphin3:8b"], False), ([STANDARD_OLLAMA_MODEL, "small:latest"], True)):
            calls = []

            def handler(request):
                calls.append(request)
                self.assertEqual(request.method, "GET")
                self.assertEqual(request.url.path, "/api/tags")
                return httpx.Response(200, json={"models": [{"name": model} for model in models]})

            with patch.dict(os.environ, {"OLLAMA_MODEL": "small:latest", "OLLAMA_FALLBACK_MODEL": "dolphin3:8b"}), mocked_client(handler):
                report = await agents_diagnostics()
            system = report["agents"]["system"]
            self.assertEqual(system["model"], STANDARD_OLLAMA_MODEL)
            self.assertEqual(system["model_installed"], expected)
            self.assertEqual(system["available_for_chat"], expected)
            self.assertNotIn("fallback_model", system)
            self.assertNotIn("fallback_installed", system)
            self.assertEqual(len(calls), 1)

    async def test_diagnostics_failure_retains_pinned_model(self):
        from ubuntu.api import agents_diagnostics

        with mocked_client(lambda request: httpx.Response(503)):
            report = await agents_diagnostics()
        system = report["agents"]["system"]
        self.assertEqual(system["model"], STANDARD_OLLAMA_MODEL)
        self.assertFalse(system["available_for_chat"])
        self.assertEqual(system["connection_status"], "OLLAMA_UNAVAILABLE")
        self.assertNotIn("fallback_model", system)


if __name__ == "__main__":
    unittest.main()
