#!/usr/bin/env python3
"""Deterministic checker for eval-1: do all manual image links resolve, and count figures?
Usage: check_links.py <manuals_dir>   (dir containing <role>/index.md)
Prints JSON: {manuals, figures, dead_links:[...], all_resolve:bool}
"""
import sys, os, re, json, glob

manuals_dir = sys.argv[1]
md_files = glob.glob(os.path.join(manuals_dir, "*", "index.md"))
img = re.compile(r'!\[[^\]]*\]\(([^)]+)\)')
figures, dead = 0, []
for f in md_files:
    base = os.path.dirname(f)
    for m in img.finditer(open(f, encoding="utf-8").read()):
        p = m.group(1).split()[0].strip()
        figures += 1
        if p.startswith(("http://", "https://", "data:")):
            continue
        resolved = os.path.normpath(os.path.join(base, p))
        if not os.path.isfile(resolved):
            dead.append({"manual": os.path.relpath(f, manuals_dir), "path": p})
print(json.dumps({
    "manuals": len(md_files),
    "figures": figures,
    "dead_links": dead,
    "all_resolve": len(dead) == 0 and figures > 0,
}, ensure_ascii=False, indent=2))
