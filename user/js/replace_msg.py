import re

path = r'D:\PICS~Pictures\shortlink\public\js\task-tracker.js'
with open(path, 'r') as f:
    content = f.read()

old = '''  /* --- Romantic Pro Tip Messages --- */
  const ROMANTIC_MSGS = [
    "Love grows when you explore something new together.",
    "Every beautiful connection starts with curiosity.",
    "Take a moment to discover what's waiting for you.",
    "The best journeys begin with a single click.",
    "Romance is found in the little discoveries."
  ];'''

new = '''  /* --- Romantic Pro Tip Messages --- */
  const ROMANTIC_MSGS = [
    "Complete one task to proceed, Click on Show me to Begin"
  ];'''

if old in content:
    content = content.replace(old, new)
    with open(path, 'w') as f:
        f.write(content)
    print('SUCCESS')
else:
    print('NOT FOUND')
    m = re.search(r'const ROMANTIC_MSGS = \[.*?\]', content, re.DOTALL)
    if m:
        print('Found:', repr(m.group()))
