import sys
import json

result = {
    "Project" : sys.argv[1],
    "FilePath": sys.argv[2]
}
# detector = "1"
json = json.dumps(result)

print(str(json))
sys.stdout.flush()