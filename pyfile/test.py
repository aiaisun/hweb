import sys
import json

result = {
    "Name" : sys.argv[1],
    "From" : sys.argv[2]
}
# detector = "1"
json = json.dumps(detector)

print(str(json))
sys.stdout.flush()