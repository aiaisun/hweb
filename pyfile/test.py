import sys
import json
inputData = {
    "FilePath" : sys.argv[1]
}
filepath = inputData["FilePath"]

outputData = {
    "result" : "Parse Succeeded.",
    "downloadPath" : "123"
}

json = json.dumps(outputData)
print(str(json))
sys.stdout.flush()