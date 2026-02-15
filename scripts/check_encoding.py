#!/usr/bin/env python3
import sys

file_path = r'C:\Users\alfre\Documents\GitHub\crosslog-pwa\src\components\mantenimiento\DashboardTaller.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Check line 72 (index 71)
line_num = 71
if line_num < len(lines):
    line = lines[line_num]
    print(f"Line {line_num + 1}:")
    print(f"Content: {repr(line)}")
    print(f"Length: {len(line)}")
    print(f"Bytes: {line.encode('utf-8').hex()}")

    # Check for non-ASCII characters
    for i, char in enumerate(line):
        if ord(char) > 127:
            print(f"Non-ASCII character at position {i}: {repr(char)} (U+{ord(char):04X})")
