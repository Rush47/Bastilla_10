"""Unit tests for the Debian BastillaOS Connect read-only API client."""
import importlib.util
import pathlib
import unittest
from unittest.mock import patch
from urllib.error import URLError

PATH = pathlib.Path(__file__).resolve().parents[1] / "packaging/bastilla-connect/connect.py"
spec = importlib.util.spec_from_file_location("bastilla_connect", PATH)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class ClientTests(unittest.TestCase):
    def test_https_and_localhost(self):
        self.assertEqual(module.validate("https://example.org"), "https://example.org")
        self.assertEqual(module.validate("http://localhost:3000"), "http://localhost:3000")

    def test_rejects_insecure_and_editor(self):
        for url in ("http://example.org", "https://user:pass@example.org",
                    "https://example.org/?token=abc",
                    "https://aistudio.google.com/apps/abc"):
            with self.subTest(url=url), self.assertRaises(ValueError):
                module.validate(url)

    def test_missing_configuration_skips(self):
        with patch.dict("os.environ", {"BASTILLA_PUBLIC_API_URL": ""}):
            self.assertEqual(module.main(), 0)

    def test_offline_api_reports_failure(self):
        with patch.dict("os.environ", {"BASTILLA_PUBLIC_API_URL": "https://example.org"}):
            with patch.object(module, "check", side_effect=URLError("offline")):
                self.assertEqual(module.main(), 1)


if __name__ == "__main__":
    unittest.main()
