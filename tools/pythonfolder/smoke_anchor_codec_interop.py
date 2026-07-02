import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def load_json(relative):
    path = ROOT / relative
    with path.open('r', encoding='utf-8') as handle:
        data = json.load(handle)
    roundtrip = json.loads(json.dumps(data, sort_keys=True, separators=(',', ':')))
    assert roundtrip == data, f'{relative} does not round-trip as plain JSON'
    return data


def require(condition, message):
    if not condition:
        raise AssertionError(message)


solver_packet = load_json('docs/examples/headless_solver_packet.example.json')
plan = load_json('docs/examples/headless_solver_plan.example.json')
fixture = load_json('tests/fixtures/codec_r1_interop_fixture.json')
result = fixture['result']
benchmark = fixture['benchmarkComparison']

require(solver_packet.get('type') == 'anchor.solverPacket', 'solver packet type')
require(str(solver_packet.get('schemaVersion')) == '2.0', 'solver packet version')
units = solver_packet.get('units') or solver_packet.get('metadata', {}).get('units') or {}
unit_text = json.dumps(units)
require('seconds' in unit_text or 'time' in unit_text, 'solver packet time units')
require('meter' in unit_text.lower() or 'coordinates' in unit_text, 'solver packet coordinate/depth units')

require(plan.get('type') == 'anchor.plan', 'plan type')
require(str(plan.get('schemaVersion')) == '2.0', 'plan version')
require(isinstance(plan.get('agentPlans', []), list), 'plan agentPlans array')

require(result.get('type') == 'anchor.result', 'result type')
require(str(result.get('schemaVersion')) == '3.0', 'result version')
require(result['scoreArtifactIdentities']['scoreResultDigest'].startswith('fnv1a32:'), 'score result digest')
require(result['scoreArtifactIdentities']['fairnessClass'] == 'PUBLIC_FAIR', 'result fairness')

require(benchmark.get('type') == 'anchor.benchmark.comparison', 'benchmark type')
require(benchmark['codecMetadata']['payloadDigest'].startswith('fnv1a32:'), 'benchmark digest')
require(benchmark['codecMetadata']['visibilityClass'] == 'PUBLIC_OBSERVATION_ONLY', 'benchmark visibility')

print(json.dumps({
    'ok': True,
    'solverPacketVersion': solver_packet.get('schemaVersion'),
    'planVersion': plan.get('schemaVersion'),
    'resultVersion': result.get('schemaVersion'),
    'benchmarkType': benchmark.get('type')
}, indent=2))