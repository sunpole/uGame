import json
import random
import unittest
from pathlib import Path

from tools.simulation.effort import resource_value_equivalent
from tools.simulation.rotation import MasterRotationAllocator
from tools.simulation.ugame_sim import (
    Simulation,
    reward_factor,
    validate_config,
)

ROOT = Path(__file__).resolve().parents[2]
CONFIG_PATH = ROOT / "data" / "simulation" / "simulation-defaults.json"
RESOURCES_PATH = ROOT / "data" / "resources.json"


class SimulationLabTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.config = json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
        cls.resources = json.loads(RESOURCES_PATH.read_text(encoding="utf-8"))

    def test_config_is_valid(self):
        self.assertEqual(validate_config(self.config), [])

    def test_reward_formula_t4_location_t4_master(self):
        self.assertAlmostEqual(reward_factor(self.config, "T4", "T4"), 2.56)

    def test_attention_value_equivalent_is_5000_stone(self):
        self.assertEqual(
            resource_value_equivalent(self.resources, "stone", "attention"),
            5000.0,
        )

    def test_t4_rotation_covers_two_candidate_zones_before_repeat(self):
        allocator = MasterRotationAllocator(
            random.Random(42),
            {"T2": 3, "T3": 2, "T4": 1},
        )
        spawns = [
            {"zoneId": "A", "resource": "stone", "desiredTier": "T4", "locationTier": "T4"},
            {"zoneId": "B", "resource": "stone", "desiredTier": "T4", "locationTier": "T4"},
        ]
        first = allocator.allocate(spawns)["realized"]
        second = allocator.allocate(spawns)["realized"]
        first_zone = spawns[first.index("T4")]["zoneId"]
        second_zone = spawns[second.index("T4")]["zoneId"]
        self.assertNotEqual(first_zone, second_zone)

    def test_no_t4_candidate_means_no_t4_spawn(self):
        allocator = MasterRotationAllocator(
            random.Random(42),
            {"T2": 3, "T3": 2, "T4": 1},
        )
        spawns = [
            {"zoneId": "A", "resource": "stone", "desiredTier": "T2", "locationTier": "T1"},
            {"zoneId": "B", "resource": "stone", "desiredTier": "T1", "locationTier": "T1"},
        ]
        realized = allocator.allocate(spawns)["realized"]
        self.assertNotIn("T4", realized)

    def test_world_caps_never_exceeded(self):
        simulation = Simulation(
            self.config,
            cycles=500,
            world_size=30,
            seed=42,
        )
        summary = simulation.run()
        self.assertEqual(summary["caps"]["capViolationCount"], 0)
        caps = self.config["worldCapsPerResource"]
        for _resource, seen in summary["caps"]["maxSeenPerResource"].items():
            for tier in ("T2", "T3", "T4"):
                self.assertLessEqual(int(seen.get(tier, 0)), int(caps[tier]))

    def test_same_seed_is_deterministic(self):
        first = Simulation(self.config, cycles=200, world_size=8, seed=123).run()
        second = Simulation(self.config, cycles=200, world_size=8, seed=123).run()
        first.pop("performance", None)
        second.pop("performance", None)
        self.assertEqual(first, second)

    def test_different_seed_changes_distribution(self):
        first = Simulation(self.config, cycles=200, world_size=8, seed=123).run()
        second = Simulation(self.config, cycles=200, world_size=8, seed=124).run()
        self.assertNotEqual(
            first["locationTiers"]["rerolls"],
            second["locationTiers"]["rerolls"],
        )


if __name__ == "__main__":
    unittest.main()
