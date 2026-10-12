"""Evidence-linked prototype selection workflow. No external model calls."""
import argparse
import json
from pathlib import Path

KEYS = ('value', 'feasibility', 'data', 'safety', 'evidence', 'clarity')

def validate(catalogue):
    sources = {s['id'] for s in catalogue['sources']}
    if len(sources) != len(catalogue['sources']):
        raise ValueError('Duplicate source IDs')
    seen = set()
    for case in catalogue['cases']:
        if case['id'] in seen or case['source_id'] not in sources:
            raise ValueError('Invalid candidate identity or source')
        seen.add(case['id'])
        for key in KEYS:
            value = case['scores'][key]
            if type(value) is not int or not 1 <= value <= 5:
                raise ValueError('Scores must be integers from 1 to 5')
        if not case['locator'] or not case['adaptation']:
            raise ValueError('Evidence provenance is required')

def rank(catalogue, weights=None, query='', risk=None):
    validate(catalogue)
    weights = weights or catalogue['weights']
    if set(weights) != set(KEYS) or any(type(v) not in (int, float) or v < 0 for v in weights.values()) or sum(weights.values()) <= 0:
        raise ValueError('Weights must cover every criterion, be nonnegative and have a positive total')
    found = []
    for case in catalogue['cases']:
        if risk and case['risk'] != risk:
            continue
        searchable = ' '.join(case[k] for k in ('title', 'category', 'user', 'workflow')).lower()
        if query.lower() not in searchable:
            continue
        weighted = sum(weights[k] * case['scores'][k] / 5 for k in KEYS)
        # Same rounding convention as browser Math.round for positive values.
        score = int(weighted / sum(weights.values()) * 100 + 0.5)
        found.append({**case, 'weighted_score': score})
    return sorted(found, key=lambda c: (-c['weighted_score'], c['title']))

def run(catalogue, output, query='', risk=None, weights=None):
    results = rank(catalogue, weights=weights, query=query, risk=risk)
    output.mkdir(parents=True, exist_ok=True)
    report = {'method': catalogue['ranking_basis'], 'weights': weights or catalogue['weights'], 'candidates': results, 'top_five': results[:5]}
    (output / 'ranked.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
    source_map = {s['id']: s for s in catalogue['sources']}
    for case in results[:5]:
        source = source_map[case['source_id']]
        brief = f"# {case['title']}\n\nUser: {case['user']}\n\nProblem: {case['pain']}\n\nWorkflow: {case['workflow']}\n\nInput: {case['demo_input']}\n\nOutput: {case['demo_output']}\n\nMeasure: {case['metric']}\n\nReview: Human approval before live action. Clinical outputs require a qualified reviewer.\n\nSource: {source['title']}, {case['locator']}\n{source['url']}\n\nAdaptation: {case['adaptation']}\n\nScore: {case['weighted_score']}/100. Initial analyst judgement, not validated ROI.\n"
        (output / (case['id'] + '-brief.md')).write_text(brief, encoding='utf-8')
    return report

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--catalogue', type=Path, default=Path(__file__).parent / 'dist/catalogue.json')
    parser.add_argument('--output', type=Path, default=Path('generated'))
    parser.add_argument('--query', default='')
    parser.add_argument('--risk', choices=('Low', 'Medium', 'High'))
    parser.add_argument('--weights', type=Path, help='JSON with all six numeric weights')
    args = parser.parse_args()
    catalogue = json.loads(args.catalogue.read_text(encoding='utf-8'))
    weights = json.loads(args.weights.read_text()) if args.weights else None
    result = run(catalogue, args.output, args.query, args.risk, weights)
    for case in result['top_five']:
        print(f"{case['weighted_score']:3}  {case['title']}")
