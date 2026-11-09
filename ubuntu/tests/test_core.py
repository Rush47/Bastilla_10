import asyncio
import tempfile
import unittest
from pathlib import Path
from ubuntu.core import Orchestrator, AGENTS, observe_system

class WorkerTests(unittest.TestCase):
    def test_agents(self):
        self.assertEqual(len(AGENTS), 4)
    def test_observation(self):
        result = asyncio.run(observe_system())
        self.assertEqual(len(result["dimensions"]), 7)
        self.assertIn("status", result["dimensions"][0])
    def test_task_persistence(self):
        async def scenario():
            with tempfile.TemporaryDirectory() as d:
                path = Path(d) / "tasks.json"
                engine = Orchestrator(path)
                task = await engine.create("Aria", "observe")
                await engine.run(task["id"])
                loaded = Orchestrator(path)
                self.assertIn(task["id"], loaded.tasks)
                self.assertEqual(loaded.tasks[task["id"]]["status"], "completed")
        asyncio.run(scenario())

if __name__ == "__main__":
    unittest.main()
