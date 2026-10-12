import json
import unittest
from pathlib import Path
from discovery import rank

class DiscoveryTests(unittest.TestCase):
    def setUp(self):
        self.catalogue = json.loads((Path(__file__).parent / 'dist/catalogue.json').read_text())

    def test_default_shortlist_and_source_provenance(self):
        ranked = rank(self.catalogue)
        self.assertEqual([c['id'] for c in ranked[:5]], ['records', 'redaction', 'intake', 'guidance', 'translation'])
        self.assertEqual(len({c['id'] for c in ranked}), 30)
        self.assertTrue(all(0 <= c['weighted_score'] <= 100 for c in ranked))

    def test_every_source_entry_maps_to_existing_workflows(self):
        entries = self.catalogue['examples']
        self.assertEqual(len(entries), 38)
        self.assertEqual(len({e['id'] for e in entries}), 38)
        ids = {c['id'] for c in self.catalogue['cases']}
        self.assertTrue(all(e['case_ids'] and set(e['case_ids']) <= ids for e in entries))
        self.assertTrue(all(e['source_id'] == 'hhs-fy25' and e['row'] >= 2 for e in entries))
        self.assertTrue(all('Retired' not in e['stage'] for e in entries))

    def test_priority_changes_and_filtering(self):
        weights = {k: 0 for k in self.catalogue['weights']}
        weights['safety'] = 100
        self.assertEqual(rank(self.catalogue, weights=weights)[0]['weighted_score'], 100)
        self.assertTrue(all(c['risk'] == 'Low' for c in rank(self.catalogue, risk='Low')))
        self.assertIn('intake', [c['id'] for c in rank(self.catalogue, query='referral')])

    def test_invalid_weights_and_missing_evidence_fail(self):
        with self.assertRaises(ValueError):
            rank(self.catalogue, weights={k: 0 for k in self.catalogue['weights']})
        self.catalogue['cases'][0]['source_id'] = 'missing'
        with self.assertRaises(ValueError):
            rank(self.catalogue)

if __name__ == '__main__':
    unittest.main()
