import os
import re

files_to_check = [
    'scripts/monitor.js',
    'scripts/recon.js',
    'HeadyAcademy/HeadyOptimizer.py',
    'HeadyAcademy/HeadyBrain.py',
    'HeadyAcademy/HeadyBrain_optimized.py',
    'src/heady_story_driver.js'
]

for filepath in files_to_check:
    if os.path.exists(filepath):
        with open(filepath, 'r') as f:
            content = f.read()
        
        # Replace occurrences of 'priority' with 'confidence' or similar CSL terms
        content = re.sub(r'priority', 'confidence', content)
        content = re.sub(r'Priority', 'Confidence', content)
        content = re.sub(r'PRIORITY', 'CONFIDENCE', content)
        
        with open(filepath, 'w') as f:
            f.write(content)

print("Replacement complete.")
