#!/usr/bin/env python3
"""
Fix mismatched quotes caused by the restructuring import replacement.
The regex replacement used hardcoded `"` but some files used `'` for imports.
This script fixes all mismatched import quotes.
"""

import re
from pathlib import Path

BASE = Path("/home/z/my-project/src")

def fix_file(filepath: Path) -> bool:
    """Fix mismatched quotes in import statements."""
    try:
        content = filepath.read_text(encoding='utf-8')
    except (UnicodeDecodeError, PermissionError):
        return False
    
    original = content
    
    # Fix patterns like: from "@/shared/...'  or  from '@/shared/..."
    # These should have matching quotes
    content = re.sub(
        r'''from (["'])@/(shared|modules|infrastructure)/([^\2]*?)\1''',
        lambda m: f'from {m.group(1)}@/{m.group(2)}/{m.group(3)}{m.group(1)}',
        content
    )
    
    # More direct approach: find lines with mismatched quotes
    lines = content.split('\n')
    fixed_lines = []
    changes = 0
    
    for line in lines:
        # Find import from patterns with mismatched quotes
        # Pattern: from "...'  or  from '..."
        match = re.search(r'''from\s+(["'])(@/(?:shared|modules|infrastructure)/.+?)(["'])\s*$''', line)
        if match:
            open_q = match.group(1)
            path = match.group(2)
            close_q = match.group(3)
            if open_q != close_q:
                line = line.replace(f'from {open_q}{path}{close_q}', f'from {open_q}{path}{open_q}')
                changes += 1
        fixed_lines.append(line)
    
    content = '\n'.join(fixed_lines)
    
    if content != original:
        filepath.write_text(content, encoding='utf-8')
        return True
    return False


def fix_all():
    print("Fixing mismatched import quotes...")
    changed = 0
    for ext in ['*.ts', '*.tsx']:
        for filepath in BASE.rglob(ext):
            if fix_file(filepath):
                changed += 1
                print(f"  Fixed: {filepath.relative_to(BASE)}")
    
    # Also fix middleware
    mw = BASE / "middleware.ts"
    if mw.exists() and fix_file(mw):
        changed += 1
        print(f"  Fixed: middleware.ts")
    
    print(f"\nTotal: {changed} files fixed")


if __name__ == "__main__":
    fix_all()
