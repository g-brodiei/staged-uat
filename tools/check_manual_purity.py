#!/usr/bin/env python3
"""Discriminator check for eval-1: are the ROLE manuals written for end users,
or are they UAT reports in disguise?

A user-facing manual should not leak internal test provenance: findings ids,
evidence-path captions, "UAT" run talk, or ✅/實測 verification tables.
Image markdown is stripped first, since ![](../../artifacts/...) links are
legitimate; we only look at prose the reader actually sees.

Usage: check_manual_purity.py <manuals_dir>
Prints JSON with per-manual counts and an overall `clean` verdict.
"""
import sys, os, re, json, glob

manuals_dir = sys.argv[1]
# role manuals only — an index/README is allowed to carry provenance
files = [f for f in glob.glob(os.path.join(manuals_dir, "*", "index.md"))]

img_md = re.compile(r'!\[[^\]]*\]\([^)]*\)')
# Hard leaks: unambiguous internal-test provenance that no end user should see.
# NOTE: a bare ✅ is NOT counted — it is a legitimate checkmark bullet in user docs.
# "實測/測試" is test-speak ("in our testing…") and counts, but is tracked separately
# because it is milder than a findings id or an evidence path.
patterns = {
    "findings_citations": re.compile(r'findings\s*#\s*\d+', re.I),
    "evidence_path_in_prose": re.compile(r'artifacts/uat\d+/'),
    "uat_mentions": re.compile(r'\bUAT\b', re.I),
    "test_provenance_words": re.compile(r'(實測|測試中|驗證通過|本次測試)'),
}

per_file, totals = {}, {k: 0 for k in patterns}
for f in sorted(files):
    prose = img_md.sub("", open(f, encoding="utf-8").read())  # drop image links
    counts = {k: len(p.findall(prose)) for k, p in patterns.items()}
    per_file[os.path.basename(os.path.dirname(f))] = counts
    for k, v in counts.items():
        totals[k] += v

print(json.dumps({
    "role_manuals": len(files),
    "per_manual": per_file,
    "totals": totals,
    "total_leaks": sum(totals.values()),
    "clean": sum(totals.values()) == 0,
}, ensure_ascii=False, indent=2))
