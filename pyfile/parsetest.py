import sys
import json
import re
import pandas as pd
import os

####Functions####

# 開啟檔案
def open_brd_file(filepath):
    f = open(filepath)
    return f

#用空格拆分每一行
def splitRow(string):
    string = string.split()
    return string

#刪除|開頭
def deleteRow1(string):
    pattern = re.compile(r"\|")
    delete = pattern.findall(string)
    return delete
#刪除- - -開頭
def deleteRow2(string):
    pattern = re.compile(r"^\-$")
    delete = pattern.findall(string)
    return delete

#找到D開頭
def findD(string):
    pattern = re.compile(r"^D")
    locationD = pattern.findall(string)
    return locationD

    # 存excel
def save_excel(write, df, sheetName):
#     df = pd.DataFrame(datalist)
    df.to_excel(write, sheet_name=f'{sheetName}', index=False)

#刪多餘的raw
def deleteNullVIAROW(df):
    for i in range(df.shape[0]):
        if df.loc[i, "location"] == "VIA" and df.loc[i, "gap"] == 0.0:
            df.drop(i, axis=0, inplace=True)
            
#這一份txt total的path 數量
def branchPathNum(df):
    #扣掉net name/start_end/total length
    maxPathNum = int((df.shape[1] - 7) / 2)
    return maxPathNum


#########CODE#########


inputData = {
    "Project" : sys.argv[1],
    "FilePath" : sys.argv[2]
}
project = inputData["Project"]
filepath = inputData["FilePath"]
# filepath = "./pyfile/0511.txt" 檔案路徑要從index.js 出發，不可從python檔角度出發
# filepath2 = ".\\public\\tmpTLC\\0511.txt"

# step1: 開啟檔案
try:
    f = open_brd_file(filepath)
    # print(f"step1: Open file. (File name: {filepath}) -DONE")

except:
    result = "File is not exit, please check file name."
    json = json.dumps(result)
    print(str(json))
    sys.stdout.flush()



# outputData = {
#     "downloadPath" : elsxPath.replace("./public/", "")
# }

outputData = "python Error"
json = json.dumps(outputData)
print(str(json))
sys.stdout.flush()