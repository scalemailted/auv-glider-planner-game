import sys
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "python"))

from anchor_benchmark import (  # noqa: E402
    astar_search,
    beam_search,
    build_anchor_plan,
    build_benchmark_record,
    build_planning_problem,
    build_reproducibility_manifest,
    dijkstra_search,
    exact_small_instance_oracle,
    greedy_value_per_cost,
    load_json,
    time_expanded_astar,
    validate_solver_packet,
    weighted_astar_search,
)


FIXTURE = ROOT.parent / "tests" / "fixtures" / "colab_benchmark" / "static_additive_routing_solver_packet.json"


class AnchorBenchmarkTests(unittest.TestCase):
    def packet(self):
        return load_json(FIXTURE)

    def problem(self):
        return build_planning_problem(self.packet(), candidate_node_limit=8)

    def test_solver_packet_validation(self):
        validation = validate_solver_packet(self.packet())
        self.assertEqual(validation["status"], "PASS")

    def test_candidate_and_graph_construction(self):
        problem = self.problem()
        self.assertGreaterEqual(len(problem.candidates), 2)
        self.assertEqual(problem.start_node_id, "start")

    def test_dijkstra_and_astar_parity(self):
        problem = self.problem()
        dijkstra = dijkstra_search(problem)
        astar = astar_search(problem)
        self.assertAlmostEqual(dijkstra.cost, astar.cost, places=6)

    def test_heuristic_planner_labels(self):
        problem = self.problem()
        self.assertEqual(weighted_astar_search(problem).optimality_status, "HEURISTIC")
        self.assertEqual(greedy_value_per_cost(problem).optimality_status, "HEURISTIC")
        self.assertEqual(beam_search(problem).optimality_status, "HEURISTIC")

    def test_time_expanded_and_exact_oracle(self):
        problem = self.problem()
        self.assertTrue(time_expanded_astar(problem).route)
        exact = exact_small_instance_oracle(problem, candidate_limit=4, route_depth=3)
        self.assertEqual(exact.optimality_status, "EXACT_FOR_DECLARED_BOUNDED_CANDIDATE_SET")

    def test_plan_record_manifest_exports(self):
        problem = self.problem()
        result = dijkstra_search(problem)
        plan = build_anchor_plan(problem, result)
        record = build_benchmark_record(problem, result, plan=plan)
        manifest = build_reproducibility_manifest(problem, [record])
        self.assertEqual(plan["type"], "anchor.plan")
        self.assertEqual(record["type"], "anchor.benchmark.run-record")
        self.assertIn("solverPacketDigest", manifest)

    def test_hidden_truth_default_rejection(self):
        packet = self.packet()
        packet["planningData"]["visibleFields"]["hiddenTruth"] = {"frames": []}
        validation = validate_solver_packet(packet)
        self.assertFalse(validation["ok"])


if __name__ == "__main__":
    unittest.main()

