
const express = require('express');
const app = express();
const multer = require('multer');
const fs = require('fs');
const utf8 = require('utf8');
const bodyParser = require('body-parser');
const session = require('express-session');
const tz = require('moment-timezone');
const moment = require('moment');
const rimraf = require("rimraf");

const mongoClient = require('mongodb').MongoClient;
const mongoObjectID = require('mongodb').ObjectId;
const mongo = 'mongodb://localhost:27017/hweb'

let mongodb = null

let { PythonShell } = require('python-shell');
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(session({
    saveUninitialized: false,
    resave: false,
    secret: '加密用的字串',
    cookie: {
        maxAge: 3600000, //一小時
    }
}))

// set the storage engine path 
const storage = multer.diskStorage({
    destination: 'public/tmpTLC/', //save path
    filename: function (req, file, cb) {
        cb(null, file.originalname);
    }
});

//init upload
const upload = multer({ storage: storage });//single image Key:myImage

//set issue storage path

const issueStorage = multer.diskStorage({

    destination: 'public/sightingFile/', //save path
    filename: function (req, file, cb) {
        cb(null, new Date().getTime() + "-" + file.originalname);
    },
    limit: {
        fileSize: 5000000
    }
});

const uploadEngine1 = multer({ storage: issueStorage });//single image Key:myImage

//email system
const nodemailer = require('nodemailer');
const { resolve } = require('path');
const { Console } = require('console');
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'alisunlcfc@gmail.com',
        pass: 'nbvmrperbmayaemk'
    }
})


// member system//
// Create a connect to MongoDB  Q 為什app要設在db 連接裡面
mongoClient.connect(mongo, { useUnifiedTopology: true }, function (err, db) {
    if (err) return console.log(err)
    mongodb = db.db("hweb");
    // mongodb = db

    // Start Service
    app.listen(3000, function () {
        console.log('Server Starts')
    })
})

//確認登入者的middleware
const checkUser = function (req, res, next) {
    req.userData = {
        isLogined: !!req.session.loginUser,
        loginUser: req.session.loginUser,
        userEName: req.session.userEName,
        role: req.session.role,
        sightingrole: req.session.sightingrole
    };
    next();
}
app.use(checkUser);

// app.use()
app.get('/', (req, res) => {
    const data = req.userData;

    res.render('home', data);
});

app.post('/', (req, res) => {
    const data = req.userData;

    res.render('home', data);
});


app.get('/user/trysession', (req, res) => {
    req.session.views = req.session.views || 0;
    req.session.views++;
    res.contentType('text/plain');
    res.write('拜訪次數:' + req.session.views + "\n");
    res.end(JSON.stringify(req.session));

})


//////////////////// 登入 ////////////////////
app.get('/user/login', async (req, res) => {
    const data = req.userData;
    const timeFormat = "YYYY-MM-DD HH:mm:ss";
    const mo1 = moment(new Date());
    if (req.session.flashMsg) {
        data.flashMsg = req.session.flashMsg;
        delete req.session.flashMsg;
    }
    if (data.isLogined) {//true
        console.log(`${data.loginUser} 於 ${mo1.format(timeFormat)} 登入`)
    }
    if (req.session.referer) {
        data.referer = req.session.referer;
        delete req.session.referer;
    }
    async function checkUsersightingRole(account) {
        const collection = mongodb.collection('users');
        const role = await collection.findOne(account, { 'projection': { "sightingrole": 1, "_id": 0 } })

        if (role) {
            req.session.sightingrole = role.sightingrole;
        } else {
            req.session.sightingrole = '';
        }
    }
    async function checkUserRole(account) {
        const collection = mongodb.collection('users');
        const role = await collection.findOne(account, { 'projection': { "role": 1, "_id": 0 } })

        if (role) {
            req.session.role = role.role;
        } else {
            req.session.role = '';
        }
    }


    let account = { 'userAccount': req.session.loginUser };
    await checkUserRole(account);
    await checkUsersightingRole(account);

    res.render('login', data);
})



app.post('/user/login', (req, res) => {
    const collection = mongodb.collection('users');
    //檢查有沒有這個帳號 
    let account = {
        'userAccount': req.body.userAccount,
        'userPW': req.body.password
    };
    collection.findOne(account, (err, document) => {
        if (document) { //true
            req.session.loginUser = req.body.userAccount;
            req.session.userEName = document.userEName;
            req.session.referer = req.body.referer;
        } else { // false
            req.session.flashMsg = "帳號密碼錯誤";
        }
        res.redirect('/user/login');
    })
    // res.redirect('/user/login'); 如果放這個 redirect之後session會被更新
})


//////////////////// 登出 ////////////////////
app.get('/user/logout', (req, res) => {
    delete req.session.loginUser;
    res.redirect('/user/login')
})

//////////////////// 註冊流程 ////////////////////
app.get('/user/register', (req, res) => {
    const data = req.userData;
    res.render('register', data);
});
app.get('/user/registerSuccess', (req, res) => {
    res.render('registerSuccess');
});

app.get('/try-finddb', (req, res) => {
    const collection = mongodb.collection('users');
    const myemail = 'ali.sun@lcfuturecenter.com';
    let emailData = { 'userEmail': myemail };
    collection.findOne({ 'userEmail': myemail }, (err, document) => {
        console.log(document);
        // const data = document.name
        res.json(document);
    })

})

app.post('/user/register', upload.single('tlcfile'), (req, res) => {
    // console.log('user in session')
    // console.log(req.session);
    const collection = mongodb.collection('users');
    const timeFormat = "YYYY-MM-DD HH:mm:ss";
    const mo1 = moment(new Date());

    //檢查有沒有這個帳號 有的話再insert     
    let account = { 'userAccount': req.body.userAccount };

    collection.findOne(account, (err, document) => {

        if (document) {
            console.log(`${document.userAccount} 嘗試重複註冊，但在 ${document.create_date}已註冊過帳號`);
            res.json({ alert: "帳號已存在" })//json字串過去一定要json格式再.出來
        } else {
            let insertDate = {
                'userCName': req.body.userCName,
                'userEName': req.body.userEName,
                'userDepartment': req.body.userDepartment,
                'userAccount': req.body.userAccount,
                'userEmail': req.body.userAccount + "@lcfuturecenter.com",
                'userPW': req.body.userpassword,
                'create_date': mo1.format(timeFormat),
                "role": "",
                "sightingrole": ""
            }
            collection.insertOne(insertDate, function (err, document) {
                if (err) return res.json(err);

                console.log(`${account.userAccount} 註冊成功`);
                //   res.redirect('registerSuccess');
                res.json({ alert: "帳號註冊成功" })
            })
        }
    })
})

//////////////////// 忘記密碼 ////////////////////
app.get('/user/forgetpw', (req, res) => {
    res.render('forgetPW')
})

app.post('/user/forgetpw', upload.single('tlcfile'), (req, res) => {
    const collection = mongodb.collection('users');
    let account = {
        'userAccount': req.body.userAccount
    };
    collection.findOne(account, (err, document) => {
        if (document) { //true

            let mailOptions = {
                from: 'alisunlcfc@gmail.com',
                to: `${account.userAccount}@lcfuturecenter.com`,
                subject: "Here's your password!",
                text: `密碼: ${document.userPW}`
            };
            console.log(`${account.userAccount} 忘記密碼`)

            transporter.sendMail(mailOptions, function (error, info) {
                if (error) {
                    console.log(error);
                } else {
                    console.log(`密碼已成功寄送給 ${mailOptions.to}`);
                    // console.log(info.response);
                }
            })

            res.json({ msg: "密碼已寄送" })
        } else { // false
            console.log(`${account.userAccount} 帳號不存在`);
            res.json({ msg: "帳號不存在" })
        }
    })
})

//////////////////// TLC 部分 ////////////////////
app.get('/tlc', (req, res) => {
    const data = req.userData;
    res.render('tlc', data);
    // res.render('tlc')
})

app.post('/tlc', upload.single('tlcfile'), (req, res) => {
    const data = req.userData;
    console.log(data.loginUser);
    console.log(req.file);//req.files 報錯
    const files = {
        "data": req.file,
        "project": req.body.project
    }
    res.json(files);
});

//test pythonshell
app.get('/call/python', pythonProcess)

function pythonProcess(req, res) {
    let options = {
        args:
            [
                req.query.name,
                req.query.from
            ]
    }

    PythonShell.run('./process.py', options, (err, data) => {
        if (err) res.send(err)
        const parsedString = JSON.parse(data)
        console.log(`name: ${parsedString.Name}, from: ${parsedString.From}`)
        res.json(parsedString)
    })

}

//parse TLC!!!!!!!!!!!! 
app.get('/tlc/parsetlc', pythonParseTLC)
function pythonParseTLC(req, res) {
    console.log("Running python file.");
    // console.log(req.query.TLCFilePath);
    // console.log(req.query.project);
    path = ".\\" + req.query.TLCFilePath;

    let options = {
        args: [
            req.query.project,//接到前端網頁的project 跟檔案路徑
            path
        ]
    }

    // 因為python file 路徑填錯,所以一直報錯
    PythonShell.run('./pyfile/parseIO_v8.py', options, (err, data) => {
        if (err) res.send(err)
        const parsedString = JSON.parse(data)
        // console.log(data);
        // console.log(parsedString);
        console.log("Program run done.");
        console.log("Result: ", parsedString);
        res.json(parsedString)

    })

};

//parse TLC!!!!!!!!!!!! 
app.get('/tlc/parsevram', pythonParseVram)
function pythonParseVram(req, res) {
    console.log("Running python file.");
    // console.log(req.query.TLCFilePath);
    // console.log(req.query.project);
    path = ".\\" + req.query.TLCFilePath;

    let options = {
        args: [
            req.query.project,//接到前端網頁的project 跟檔案路徑
            path
        ]
    }

    // 因為python file 路徑填錯,所以一直報錯
    PythonShell.run('./pyfile/parseVram_v3.py', options, (err, data) => {
        if (err) res.send(err)
        const parsedString = JSON.parse(data)
        // console.log(data);
        // console.log(parsedString);
        console.log("Program run done.");
        console.log("Result: ", parsedString);
        res.json(parsedString)

    })
};


///////consumables 耗材
app.get('/consumables', (req, res) => {
    const data = req.userData;
    const consumablesCollection = mongodb.collection('consumables');
    consumablesCollection.find().toArray(function (err, document) {
        if (err) return console.log(err)

        data.data = document
        res.render('consumables', data);
    })
});


//實現刷新紀錄 refresh 方法二
// app.post('/consumables/refreshrecord', upload.single('tlcfile'), (req, res) => {
//     let itemID = {
//         '_id': mongoObjectID(req.body.recordID),
//     }
//     const consumablesCollection = mongodb.collection('consumables');
//     consumablesCollection.findOne(itemID, (err, document) => {

//         console.log("backend got1")
//         res.json(document.record);
//     })
// });

//新增耗材項目的網頁
app.get('/consumables/add', (req, res) => {
    const data = req.userData;
    res.render('consumablesAdd', data);
});

app.post('/consumables/add', (req, res) => {
    const consumablesCollection = mongodb.collection('consumables');
    let newConsumable = [{
        'item': req.body.item,
        'brand': req.body.brand,
        'model': req.body.model,
        'description': req.body.description,
        'quantity': parseInt(req.body.quantity),
        'gavequantity': 0,
        'record': []
    }]
    consumablesCollection.insertMany(newConsumable, function (err, document) {
        if (err) return res.json(err);
        console.log("新增成功");
    })

    res.redirect('/consumables');
});

//新增耗材領用紀錄
app.post('/consumables/addrecord', upload.single('tlcfile'), (req, res) => {
    const timeFormat = "YYYY-MM-DD";
    const mo1 = moment(new Date());
    const consumablesCollection = mongodb.collection('consumables');
    let itemID = {
        '_id': mongoObjectID(req.body.addModalItemID),
    }
    let record = {
        'recipient': req.body.recipient,
        'quantity': parseInt(req.body.recipientQuantity),
        'receiveDate': mo1.format(timeFormat),
    };

    consumablesCollection.findOneAndUpdate(itemID, { $inc: { 'gavequantity': parseInt(record.quantity) } }, (err, document) => {

    })
    consumablesCollection.findOneAndUpdate(itemID, { $inc: { 'quantity': - parseInt(record.quantity) } }, (err, document) => {

    })
    consumablesCollection.findOneAndUpdate(itemID, { $push: { 'record': record } }, (err, document) => {
        if (err) return res.json(err);
        console.log(`新增領用紀錄成功- ${record.receiveDate}, ${record.recipient}領用${document.value.brand}${document.value.item}，數量 ${record.quantity}`);
    })
    res.json(req.body);
})

//修改耗材項目資訊或新增數量
app.post('/consumables/reviseitem', upload.single('tlcfile'), (req, res) => {
    const consumablesCollection = mongodb.collection('consumables');
    let itemID = {
        '_id': mongoObjectID(req.body.itemId),
    }
    let reviseConsumable = {
        'item': req.body.item,
        'brand': req.body.brand,
        'model': req.body.model,
        'description': req.body.description,
        'quantity': parseInt(req.body.quantity)
    }
    consumablesCollection.findOneAndUpdate(itemID, { $set: reviseConsumable }, (err, document) => {
        if (err) return res.json(err);
    })
    res.json(req.body)
})


///////tools 工具
app.get('/tool', async (req, res) => {

    const data = req.userData;
    data.delete = req.session.delete;
    delete req.session.delete;


    // console.log("sould be 2", data)
    const consumablesCollection = mongodb.collection('tool');
    consumablesCollection.find().toArray(function (err, document) {
        if (err) return console.log(err)

        data.data = document,
            res.render('tool', data);
        // req.session.delete = false;
    })

});

//新增工具項目的網頁
app.get('/tool/add', (req, res) => {
    const data = req.userData;
    res.render('toolAdd', data);
});

app.post('/tool/add', (req, res) => {
    const consumablesCollection = mongodb.collection('tool');
    let assetNumberList = []
    // console.log(req.body.assetNum);
    if (typeof req.body.assetNum == 'object') {
        for (let i = 0; i < req.body.assetNum.length; i++) {
            assetNumberList.push({ "id": i, "assetnumber": req.body.assetNum[i], "keeper": "", "borrowrecord": [] })
        }
    } else {
        assetNumberList = [{
            "id": 0,
            "assetnumber": req.body.assetNum,
            "keeper": "",
            "borrowrecord": []
        }]
    };
    console.log(assetNumberList);
    let newTool = {
        'item': req.body.item,
        'brand': req.body.brand,
        'model': req.body.model,
        'description': req.body.description,
        "assetlist": assetNumberList
    };
    consumablesCollection.insertOne(newTool, function (err, document) {
        if (err) return res.json(err);
        // console.log(newTool)
    })
    console.log(`新增${newTool.item}成功`)
    res.redirect('/tool');
});

//新增工具借用紀錄
app.post('/tool/addrecord', upload.single('tlcfile'), (req, res) => {
    const timeFormat = "YYYY-MM-DD";
    const mo1 = moment(new Date());

    const consumablesCollection = mongodb.collection('tool');
    let itemID = {
        '_id': mongoObjectID(req.body.borrowModalItemID),
    };

    let borrowRecord = {
        'borrowDate': mo1.format(timeFormat),
        'borrower': req.body.borrower,
    }

    consumablesCollection.findOneAndUpdate(itemID,
        { $set: { "assetlist.$[elem].keeper": req.body.borrower } },
        { arrayFilters: [{ "elem.assetnumber": req.body.assetnumber }] },
        (err, document) => {
            if (err) return console.log(err);
        });
    consumablesCollection.findOneAndUpdate(itemID,
        { $push: { 'assetlist.$[elem].borrowrecord': borrowRecord } },
        { arrayFilters: [{ "elem.assetnumber": req.body.assetnumber }] },
        (err, document) => {
            if (err) return res.json(err);
            console.log(`新增借用紀錄成功- ${borrowRecord.borrowDate}, ${req.body.borrower} 借用 ${req.body.assetnumber}`);
        });
    res.json(req.body)
});

//顯示細節出借紀錄
app.get('/toolrecord/:toolID/:assetID', (req, res) => {
    const data = req.userData;
    let itemID = {
        '_id': mongoObjectID(req.params.toolID)
    };

    const consumablesCollection = mongodb.collection('tool');

    consumablesCollection.findOne(itemID, (err, document) => {
        if (err) return console.log(err);

        assetName = document.assetlist[req.params.assetID].assetnumber
        borrowrecord = document.assetlist[req.params.assetID].borrowrecord;

        data.data = borrowrecord;
        data.assetName = assetName;
        res.render('toolrecord', data);
    });
});

//修改tool資料
app.get('/toolrevise/:toolID', (req, res) => {
    const data = req.userData;

    const consumablesCollection = mongodb.collection('tool');
    let itemID = {
        '_id': mongoObjectID(req.params.toolID)
    };
    consumablesCollection.findOne(itemID, (err, document) => {
        if (err) return console.log(err);
        data.item = document.item;
        data.brand = document.brand;
        data.model = document.model;
        data.description = document.description;
        data.assetList = document.assetlist;
        res.render('toolRevise', data)
    });
});

app.post('/toolrevise/:toolID', (req, res) => {
    const consumablesCollection = mongodb.collection('tool');
    let itemID = {
        '_id': mongoObjectID(req.params.toolID),
    }

    let data = {
        'item': req.body.item,
        'brand': req.body.brand,
        'model': req.body.model,
        'description': req.body.description,
    }

    consumablesCollection.findOneAndUpdate(itemID, { $set: data }, (err, document) => {
        if (err) return res.json(err);

    });
    //增加工具下新的資產編號
    for (let i in req.body.newAssetNum) {
        if (req.body.assetID.includes(i)) {
            let newAssetNum = req.body.newAssetNum[i];
            if (req.body.oldAssetNum.includes(newAssetNum) == false) {
                consumablesCollection.findOneAndUpdate(itemID,
                    { $set: { 'assetlist.$[elem].assetnumber': newAssetNum } },
                    { arrayFilters: [{ "elem.assetnumber": req.body.oldAssetNum[i] }] },
                    (err, document) => {
                        if (err) return res.json(err);
                    });
            };
        } else {
            let assetlist = {
                'id': parseInt(i),
                'assetnumber': req.body.newAssetNum[i],
                "keeper": "",
                "borrowrecord": []
            };
            consumablesCollection.findOneAndUpdate(itemID,
                { $push: { 'assetlist': assetlist } },
                (err, document) => {
                    if (err) return res.json(err);
                });
        };
    };
    res.redirect('/tool');
})


//刪除tool
app.post('/toolrevise/:toolID/delete', upload.single(), (req, res) => {
    req.session.delete = true;

    // console.log(req.session)
    const consumablesCollection = mongodb.collection('tool');
    // res.json('success');
    let itemID = { '_id': mongoObjectID(req.params.toolID) }

    consumablesCollection.deleteOne(itemID, (err, document) => {
        if (err) return res.json(err);
        res.json('刪除成功');
    });
})

//歸還工具
app.post('/tool/return', upload.single('tlcfile'), (req, res) => {
    const consumablesCollection = mongodb.collection('tool');
    const timeFormat = "YYYY-MM-DD";
    const mo1 = moment(new Date());

    let itemID = {
        '_id': mongoObjectID(req.body.toolID)
    };
    let returnDate = {
        'returnDate': mo1.format(timeFormat)
    }
    consumablesCollection.findOne({ "assetlist": { "$elemMatch": { "assetnumber": req.body.assetNum } } },
        { "projection": { "assetlist.$": 1 } },
        (err, document) => {
            if (err) return res.json(err);
            let data = {
                "toolID": req.body.toolID,
                "assetNum": req.body.assetNum,
                "returnee": req.body.returnee,
                "order": document.assetlist[0].id,
            }
            res.json(data)
        })

    consumablesCollection.findOneAndUpdate(itemID,
        { $set: { 'assetlist.$[elem].keeper': "" } },
        { arrayFilters: [{ "elem.assetnumber": req.body.assetNum }] },
        (err, document) => {
            if (err) return res.json(err);
        });

    consumablesCollection.findOneAndUpdate(itemID,
        { $set: { 'assetlist.$[elem0].borrowrecord.$[elem1].returnDate': returnDate.returnDate } },
        {
            arrayFilters: [{
                "elem0.assetnumber": req.body.assetNum
            },
            {
                "elem1.borrower": req.body.returnee,
                "elem1.returnDate": {
                    $exists: false
                }
            }]
        },
        (err, document) => {
            if (err) return res.json(err);
            console.log(`新增歸還紀錄成功- ${returnDate.returnDate}, ${req.body.returnee} 歸還 ${req.body.assetNum}`);
        });

})

///////////////////////
///軟體
///////
app.get('/software', (req, res) => {
    const data = req.userData;
    //今天日期
    const timeFormat = "YYYY-MM-DD";
    const today = moment(new Date());
    data.today = today.format(timeFormat);

    const swCollection = mongodb.collection('software');
    swCollection.find().toArray(function (err, document) {
        if (err) return console.log(err)

        data.data = document,
            res.render('sw', data);

    })



});

//新增採購軟體的網頁 第二種

app.get('/addsoftware/:swID', (req, res) => {
    const item = { '_id': mongoObjectID(req.params.swID) };
    const data = req.userData;

    const swCollection = mongodb.collection('software');
    swCollection.findOne(item, { 'projection': { "item": 1, "partNumber": 1 } }, function (err, document) {
        if (err) return console.log(err)

        data.data = document,
            res.render('swAdd2', data);

    })

});
app.post('/addsoftware/:swID', async (req, res) => {
    const swCollection = mongodb.collection('software');
    const item = { '_id': mongoObjectID(req.params.swID) };

    async function insertData(item, newSW) { //function 先找筆數再insert進去
        const setQuantity = await swCollection.findOne(item, { 'projection': { "_id": 0, "list.hostID": 1 } })
        const length = setQuantity.list.length;

        newSW.ID = length + 1;
        await swCollection.findOneAndUpdate(item, { $push: { list: newSW } });
    };
    const newSW = {
        "purchaseDate": req.body.purchaseDate,
        "order": req.body.orderNumber,
    }
    if (req.body.quantity > 1) {//如果筆數超過1
        for (let i = 0; i < req.body.hostID.length; i++) {
            newSW.hostID = req.body.hostID[i];
            newSW.expireDate = req.body.expireDate[i];
            await insertData(item, newSW);
        }
    } else {
        newSW.hostID = req.body.hostID;
        newSW.expireDate = req.body.expireDate;
        await insertData(item, newSW);

    };
    res.redirect('/software');
});

//新增採購軟體的網頁 第一種 
//開發完可以把這個刪掉 swADD.ejs 和這兩個app
app.get('/software/add', (req, res) => {
    const data = req.userData;
    const swCollection = mongodb.collection('software');
    swCollection.find({}, { 'projection': { "item": 1, "partNumber": 1 } }).toArray(function (err, document) {
        if (err) return console.log(err)

        data.data = document,
            res.render('swAdd', data);
        // console.log(document)
    })

});
app.post('/software/add', async (req, res) => {
    const swCollection = mongodb.collection('software');

    async function insertData(item, newSW) {
        const setQuantity = await swCollection.findOne(item, { 'projection': { "_id": 0, "list.hostID": 1 } })
        const length = setQuantity.list.length;

        newSW.ID = length + 1;
        await swCollection.findOneAndUpdate(item, { $push: { list: newSW } });

    }

    if (req.body.quantity > 1) {

        for (let i = 0; i < req.body.item.length; i++) {
            const item = { 'item': req.body.item[i] };

            const newSW = {
                "hostID": req.body.hostID[i],
                "purchaseDate": req.body.purchaseDate,
                "expireDate": req.body.expireDate[i],
                "order": req.body.orderNumber,
            }
            await insertData(item, newSW)

        }
    } else {
        const item = { 'item': req.body.item };
        const newSW = {
            "hostID": req.body.hostID,
            "purchaseDate": req.body.purchaseDate,
            "expireDate": req.body.expireDate,
            "order": req.body.orderNumber,
        }
        await insertData(item, newSW)
    }
    res.redirect('/software');
});


//新增SW軟體
app.get('/software/additem', (req, res) => {
    const data = req.userData;
    res.render('swAddItem', data);
});
app.post('/software/additem', (req, res) => {
    const data = req.userData;
    const swCollection = mongodb.collection('software');
    let newSW = {
        'item': req.body.item,
        'partNumber': req.body.partNumber,
        'quantity': 0,
        'list': []
    };
    swCollection.insertOne(newSW, function (err, document) {
        if (err) return res.json(err);
        // console.log(newSW)
    })
    console.log(`新增${newSW.item}成功`)
    res.redirect('/software');
});

//SW INFO
app.get('/software/:ID', (req, res) => {
    const data = req.userData;
    const swCollection = mongodb.collection('software');
    const item = { '_id': mongoObjectID(req.params.ID) };
    swCollection.findOne(item, function (err, document) {
        if (err) return console.log(err)


        const timeFormat = "YYYY-MM-DD";
        const today = moment(new Date());
        const currentDate = today.format(timeFormat);

        for (let i = 0; i < document.list.length; i++) {

            const SW = document.list[i];
            // console.log(SW.expireDate);
            // console.log(currentDate);
            const currentYear = parseInt(currentDate.substring(0, 4));//2020
            const expYear = parseInt(SW.expireDate.substring(0, 4));
            const currentMonth = parseInt(currentDate.substring(5, 7));
            const expMonth = parseInt(SW.expireDate.substring(5, 7));
            const currentDay = parseInt(currentDate.substring(8, 10));
            const expDay = parseInt(SW.expireDate.substring(8, 10));
            if (currentYear < expYear) {
                SW.status = "使用中"
            } else if (currentYear == expYear) {
                if (expMonth - currentMonth > 3) {
                    SW.status = "使用中"
                } else {
                    SW.status = "即將過期"
                }
            } else {
                SW.status = "過期"
            }
        }

        data.data = document;
        // console.log(data.data.list);
        res.render('swDetail', data);

    })

});

app.post('/software/:ID/newmaintain', upload.single(), (req, res) => {

    const swCollection = mongodb.collection('software');
    const item = { '_id': mongoObjectID(req.params.ID) };
    let newPur = {
        'newPurDate': req.body.newPur,
        'newExpDate': req.body.newExp
    }
    let SWID = parseInt(req.body.SWID);
    swCollection.findOneAndUpdate(item,
        { $set: { 'list.$[elem].expireDate': req.body.newExp } },
        { arrayFilters: [{ "elem.ID": SWID }] },
        (err, document) => {
            if (err) return res.json(err);
        });
    swCollection.findOneAndUpdate(item,
        { $push: { 'list.$[elem].purchaseRecord': newPur } },
        { arrayFilters: [{ "elem.ID": SWID }] },
        (err, document) => {
            if (err) return res.json(err);
            console.log(`新增軟體續購紀錄成功- ${document.value.item} 第${SWID}套,  ${newPur.newPurDate} 到 ${newPur.newExpDate}`);
        });
    const timeFormat = "YYYY-MM-DD";
    const today = moment(new Date());
    const currentDate = today.format(timeFormat);
    const data = req.body;
    data.currentDate = currentDate;

    res.json(req.body)

});

//新增備註
app.post('/software/:ID/revisenote', upload.single(), (req, res) => {
    const swCollection = mongodb.collection('software');
    const item = { '_id': mongoObjectID(req.params.ID) };
    let SWID = parseInt(req.body.SWID);

    const timeFormat = "YYYY-MM-DD";
    const today = moment(new Date());
    const noteDate = today.format(timeFormat);

    let newNote = {
        'noteDate': noteDate,
        'note': req.body.note
    };
    swCollection.findOneAndUpdate(item,
        { $push: { 'list.$[elem].noteRecord': newNote } },
        { arrayFilters: [{ "elem.ID": SWID }] },
        (err, document) => {
            if (err) return res.json(err);
            console.log(`新增軟體備註成功- ${newNote.newPurDate}, ${document.value.item} 第${SWID}套。`);
        });
    res.json(req.body);
})
//revise SW 紀錄
app.get('/software/:ID/revise/:setID', (req, res) => {
    const data = req.userData;
    const swCollection = mongodb.collection('software');

    swCollection.findOne({ '_id': mongoObjectID(req.params.ID), "list": { "$elemMatch": { "ID": parseInt(req.params.setID) } } },
        { "projection": { "list.$": 1, "item": 1 } },
        (err, document) => {
            if (err) return console.log(err);
            // console.log(document);
            data._id = document._id;
            data.item = document.item;
            data.list = document.list[0];
            // console.log(data)
            // res.json(data);
            res.render('reviseSWDetail', data)
        });

});

app.post('/software/:ID/revise/:setID', (req, res) => {
    const data = req.userData;
    const swCollection = mongodb.collection('software');
    const item = { '_id': mongoObjectID(req.params.ID) };
    let SWID = parseInt(req.params.setID);
    let newdata = {
        'hostID': req.body.hostID,
        'expireDate': req.body.expireDate
    };
    const purchaseRecord = []

    if (typeof req.body.newPurDate == 'object') {//如果筆數超過1

        for (let i = 0; i < req.body.newPurDate.length; i++) {
            const eachRecord = {
                newPurDate: req.body.newPurDate[i],
                newExpDate: req.body.newExpireDate[i]
            }
            purchaseRecord.push(eachRecord);
        }
        newdata.purchaseRecord = purchaseRecord;
        swCollection.findOneAndUpdate(item,
            {
                $set: {
                    'list.$[elem].hostID': req.body.hostID,
                    'list.$[elem].expireDate': req.body.expireDate,
                    'list.$[elem].purchaseRecord': purchaseRecord
                }
            },
            { arrayFilters: [{ "elem.ID": SWID }] },
            (err, document) => {
                if (err) return res.json(err);
            });
    } else {
        const eachRecord = {
            newPurDate: req.body.newPurDate,
            newExpDate: req.body.newExpireDate
        };
        newdata.purchaseRecord = [eachRecord];

        swCollection.findOneAndUpdate(item,
            {
                $set: {
                    'list.$[elem].hostID': req.body.hostID,
                    'list.$[elem].expireDate': req.body.expireDate,
                    'list.$[elem].purchaseRecord': [eachRecord]
                }
            },
            { arrayFilters: [{ "elem.ID": SWID }] },
            (err, document) => {
                if (err) return res.json(err);
            });

    }
    res.redirect(`/software/${req.params.ID}`)
});

///儀器預約系統
app.get('/facility/booking', (req, res) => {
    // console.log("booking system")
    res.render('bookingsystem')
})

/////sighting
app.get('/sighting', (req, res) => {
    const data = req.userData;
    // console.log(data);
    res.render('sightingHome', data)
})

app.get('/sighting/submit', (req, res) => {
    const data = req.userData;

    res.render('sightingForm', data)
});


//submit issue
app.post('/sighting/submit', uploadEngine1.array('issueFile'), (req, res) => {
    const data = req.userData;
    const userCollection = mongodb.collection('users');
    const sightingCollection = mongodb.collection('sighting');
    const timeFormat = "YYYY-MM-DD HH:mm";
    const mo1 = moment(new Date());

    // 建資料夾
    const ALIno = req.body.ALIno;
    const newDir = `public\\sightingFile\\${ALIno}`;
    if (!fs.existsSync(newDir)) {
        fs.mkdirSync(newDir);
    };

    //建立圖片路徑array 以及把所有上船的檔案放進ali的資料夾裡面
    const filesPath = [];
    for (let i = 0; i < req.files.length; i++) {
        let newPath = `${newDir}\\${req.files[i].filename}`;
        webPath = newPath.replace("public\\", "")
        filesPath.push(webPath);
        fs.rename(req.files[i].path, newPath, () => {
        })
    };


    const issue = {
        'ALINo': req.body.ALIno,
        'createDate': mo1.format(timeFormat),
        'creator': req.session.loginUser,
        'status': 'Working',
        'phase': "NPI",
        'title': req.body.title,
        'priority': req.body.priority,
        'project': req.body.project,
        'category': req.body.category,
        'BIOSV': req.body.BIOSV,
        'ECV': req.body.ECV,
        'BOXSKU': req.body.BOXSKU,
        'preloadV': req.body.preloadV,
        'TIPV': req.body.TIPV,
        'TIGUIV': req.body.TIGUIV,
        'BBFWV': req.body.BBFWV,
        'iTBTV': req.body.iTBTV,
        'description': req.body.description,
        'reproduce': req.body.reproduce,
        'attachment': filesPath,
        'remark': [],
        'ARList': [],
        'transfer': false
    };
    const mailOptions = {
        from: 'alisunlcfc@gmail.com',
        to: '',
        subject: `[Sighting Inform] ${issue.ALINo} is created.`,
        html: `<h1 style='font-style: Calibri; background-color: #df1014;color :white;'> ALI No. ${issue.ALINo}</h1>
             
                    <h2 style='font-style: Calibri;'>Category    : ${issue.category}</h2>\ 
                    <h2 style='font-style: Calibri;'>Priority    : ${issue.priority}</h2>\
                    <h2 style='font-style: Calibri;'>Project     : ${issue.project}</h2>\
                    <h2 style='font-style: Calibri;'>Title       : ${issue.title}</h2>\                   
                    <h2 style='font-style: 微軟正黑體;'>Description : ${issue.description}</h2>\
                    <h2 style='font-style: 微軟正黑體;'>http://10.158.150.248:3000/sighting/${issue.ALINo}</h2>\
                    `
    };

    if (req.body.category == "CPU") {
        issue.owner = "alii.sun"
        mailOptions.to = `${issue.owner}@lcfuturecenter.com`;
    } else if ((req.body.category == "GPU")) {
        issue.owner = "mark.lai";
        mailOptions.to = `${issue.owner}@lcfuturecenter.com`;
    } else if ((req.body.category == "USBC")) {
        issue.owner = "anthony.ye";
        mailOptions.to = `${issue.owner}@lcfuturecenter.com`;
    } else {
        issue.owner = "alii.sun";
        mailOptions.to = `${issue.owner}@lcfuturecenter.com`;
    }

    sightingCollection.insertOne(issue, function (err, document) {
        if (err) return res.json(err);
        console.log(`ALI creared: No. ${issue.ALINo}, creator ${issue.creator}`);

        transporter.sendMail(mailOptions, function (error, info) {
            if (error) {
                console.log(error);
            } else {
                console.log(`已成功通知 ${mailOptions.to}`);
                // console.log(info.response);
            }
        })
    })
    // 把issue加到creator 的issue list 裡面
    console.log(data);
    const user = data.loginUser
    const queryCondition = { userAccount: user }
    // { $set: { 'priority': req.body.priority } },
    userCollection.findOne(queryCondition, function (err, document) {
        if (err) return res.json(err);
        console.log(document)
    });
    res.redirect('/sighting')
})


app.post('/sighting/query', upload.single(), async (req, res) => {
    const sightingCollection = mongodb.collection('sighting');
    const querySelectors = {
        'ALIno': req.body.ALIno,
        'title': req.body.title,
        'project': req.body.project,
        'category': req.body.category,
        'priority': req.body.priority,
    };
    // console.log(querySelectors);
    // 搜尋db的function

    function queryMany(queryCondition) {
        sightingCollection.find(queryCondition, { 'projection': { "priority": 1, "ALINo": 1, "title": 1, "status": 1, "category": 1, "project": 1, "createDate": 1, "owner": 1 } }).toArray(function (err, document) {
            if (err) return res.json(err);

            res.json(document);
        });
    }

    if (querySelectors.ALIno) {//只搜尋編號
        const queryCondition = { "ALINo": querySelectors.ALIno };
        queryMany(queryCondition);
    } else if (!querySelectors.title && !querySelectors.project && !querySelectors.category && !querySelectors.priority) {
        res.json('')
    } else {//如果沒有 Ali no.
        /////這裡宣告所有的queryconditions
        const queryCondition = {};
        if (querySelectors.title) {
            queryCondition.title = { $regex: querySelectors.title };
        };

        if (querySelectors.project) {
            queryCondition.project = querySelectors.project;
        };
        if (querySelectors.category) {
            // console.log(querySelectors.category)
            const conditionList = [];

            if (typeof querySelectors.category == 'object') {//多個priority
                //單一category 的query conditions

                for (let i = 0; i < querySelectors.category.length; i++) {
                    conditionList.push(querySelectors.category[i]);
                }
                queryCondition.category = { $in: conditionList };

            } else {
                //單一category
                queryCondition.category = querySelectors.category;
            }
        };

        if (querySelectors.priority) {
            // console.log(querySelectors.priority)
            const conditionList = [];
            if (typeof querySelectors.priority == 'object') {//多個priority
                //先整理priority 的query conditions

                for (let i = 0; i < querySelectors.priority.length; i++) {
                    conditionList.push(querySelectors.priority[i]);
                }
                queryCondition.priority = { $in: conditionList };

            } else {
                //單一priority
                queryCondition.priority = querySelectors.priority;
            }
        }
        // console.log(queryCondition);
        queryMany(queryCondition);

    }

});

//issue 詳細網頁的功能
app.get('/sighting/:alino', upload.single(), (req, res) => {
    const data = req.userData;
    const sightingCollection = mongodb.collection('sighting');
    const queryCondition = { "ALINo": req.params.alino };
    sightingCollection.findOne(queryCondition, function (err, document) {
        if (err) return res.json(err);
        data.data = document;
        const webPAth = []
        for (let i = 0; i < data.data.attachment.length; i++) {
            // 取路徑上的檔案名稱
            webPAth.push(data.data.attachment[i].split("\\").slice(-1)[0])
        }

        data.data.webPAth = webPAth;
        // console.log(data);
        res.render('sightingDetails', data)
    });
})

app.post('/sighting/:alino', upload.single(), async (req, res) => {
    const sightingCollection = mongodb.collection('sighting');
    const userCollection = mongodb.collection('users');
    const queryCondition = { "ALINo": req.params.alino };
    const timeFormat = "YYYY-MM-DD HH:mm";
    const mo1 = moment(new Date());

    //change status and priority  
    if (req.body.status) {
        sightingCollection.findOneAndUpdate(queryCondition,
            { $set: { 'status': req.body.status } },
            function (err, document) {
                if (err) return res.json(err);
                // console.log(document);
                res.json(req.body);
            });
    };
    if (req.body.priority) {
        sightingCollection.findOneAndUpdate(queryCondition,
            { $set: { 'priority': req.body.priority } },
            function (err, document) {
                if (err) return res.json(err);
                // console.log(document);
                res.json(req.body);
            });
    };

    //send mail 
    // function sendMail(mailOptions, consoleMSG) {
    //     transporter.sendMail(mailOptions, function (error, info) {
    //         if (error) {
    //             console.log(error);
    //         } else {
    //             console.log(consoleMSG);
    //         }
    //     })
    // };
    // const mailOptions = {
    //     from: 'alisunlcfc@gmail.com',
    //     to: `${ownerEmail}`,
    //     subject: `[Sighting Inform] Issue ${queryCondition.ALINo} transfer request is rejected.`,
    //     html: `<h1 style='font-style: Calibri; background-color: #df1014;color :white;'> ALI No. ${queryCondition.ALINo}</h1>\                     
    //     <h2 style='font-style: Calibri;'>Result     :  Reject</h2>\
    //     <h2 style='font-style: Calibri;'>Comment    : ${req.body.transferTempComment}</h2>\ 
    //                 <h2 style='font-style: 微軟正黑體;'>http://10.158.150.248:3000/sighting/${queryCondition.ALINo}</h2>\
    //                 `
    // };
    // const consoleMSG = `${queryCondition.ALINo} transfering, already informed ${req.body.CAT} owner ${ownerEmail}`;

    //找出owner email
    async function findOwnerEmail(queryCondition) {
        // const issueCAT = await sightingCollection.findOne(queryCondition,
        //     { 'projection': { "category": 1, "_id": 0 } });

        const Owner = await userCollection.findOne({ 'sightingrole': req.body.CAT });
        const OwnerEmail = Owner.userEmail;
        await console.log(OwnerEmail);
        return OwnerEmail
    };
    const transferToCAT = { "sightingrole": req.body.CAT };
    console.log(req.body);
    if (req.body.CAT) {
        // insertTransferHis(sightingCollection, queryCondition, req.body.CAT);
        await findOwnerEmail(transferToCAT);

        sightingCollection.findOneAndUpdate(queryCondition,
            { $set: { 'transfer': true, 'transferTemp': req.body.CAT, "transferTempComment": req.body.transferTempComment } },
            function (err, document) {
                if (err) return res.json(err);
                // console.log(document);
                res.json(req.body);
            });

    };
    if (req.body.cancelTransfer) {
        // insertTransferHis(sightingCollection, queryCondition, req.body.CAT);
        sightingCollection.findOneAndUpdate(queryCondition,
            { $set: { 'transfer': false, 'transferTemp': "", "transferTempComment": "" } },
            function (err, document) {
                if (err) return res.json(err);
                // console.log(document);
                res.json(req.body);
            });
    };


})

//add remark
app.post('/sighting/:alino/addRemark', upload.single(), (req, res) => {

    const sightingCollection = mongodb.collection('sighting');
    const queryCondition = { "ALINo": req.params.alino };

    const data = req.userData;
    const remarker = data.loginUser;
    const timeFormat = "YYYY/MM/DD HH:mm";
    const today = moment(new Date());
    const remarkDate = today.format(timeFormat);
    console.log(remarkDate);
    console.log(remarker);

    const remark = {
        "date": remarkDate,
        "remarker": remarker,
        "remark": req.body.remark,
    }
    sightingCollection.findOneAndUpdate(queryCondition,
        { $push: { 'remark': remark } },
        function (err, document) {
            if (err) return res.json(err);
            res.json(remark);
        });

})

//owner add new AR 
app.post('/sighting/:alino/addAR', uploadEngine1.array('ARFile'), async (req, res) => {
    const sightingCollection = mongodb.collection('sighting');
    const queryCondition = { "ALINo": req.params.alino };
    const data = req.userData;
    const commenter = data.loginUser;

    // console.log(req.body);
    console.log(req.files);

    // 建資料夾
    const folderName = req.params.alino;
    const folderPath = `public\\sightingFile\\${folderName}\\ARFile`;
    if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath);
    };

    //建立圖片路徑array 以及把所有上船的檔案放進ali的資料夾裡面
    const filesPath = [];
    for (let i = 0; i < req.files.length; i++) {
        let newPath = `${folderPath}\\${req.files[i].filename}`;
        let webPath = newPath.replace("public\\", "")
        filesPath.push(webPath);
        fs.rename(req.files[i].path, newPath, () => {
        })
    };
    // file的數量
    const ARFilePath = [];

    let fileIdx = 0;
    for (let i in req.body.ARFileNum) {
        const filePath = [];
        // console.log(fileIdx);
        // console.log(parseInt(req.body.ARFileNum[i]));//幾個file
        for (let j = 0; j < parseInt(req.body.ARFileNum[i]); j++) {
            // console.log("j",j);
            // console.log("fileidx",fileIdx)
            // let webPath = newPath.replace("public\\", "")
            // filesPath.push(webPath);
            filePath.push(`${folderPath.replace("public\\", "")}\\${req.files[fileIdx].filename}`);
            fileIdx++;
        };
        ARFilePath.push(filePath);
    };

    console.log(ARFilePath)
    const
        newAR = {
            "ID": 1,
            "date": req.body.ARDate,
            "commenter": commenter
        };
    if (typeof req.body.ar == 'object') {
        newAR.AR = [];
        for (let i = 0; i < req.body.ar.length; i++) {
            newAR.AR.push({
                "index": i,
                "request": req.body.ar[i],
                "requestARFile": ARFilePath[i],
                "reply": ""
            });
    
        };
    } else {
        newAR.AR = [{
            "index": 0,
            "request": req.body.ar,
            "requestARFile": ARFilePath[0],
            "reply": ""
        }];
    }
    async function findARNum(queryCondition, newAR) {
        const ARNum = await sightingCollection.findOne(queryCondition, { 'projection': { "_id": 0, "ARList": 1 } })
        const num = ARNum.ARList.length;
        newAR.ID = num + 1;
        await sightingCollection.findOneAndUpdate(queryCondition, { $push: { 'ARList': newAR } });
    }
    await findARNum(queryCondition, newAR);
    res.json(newAR);
})
//回覆AR 
app.post('/sighting/:alino/replyAR', upload.single(), (req, res) => {

    const sightingCollection = mongodb.collection('sighting');
    const queryCondition = { "ALINo": req.params.alino };

    sightingCollection.findOneAndUpdate(queryCondition,
        { $set: { 'ARList.$[elem].AR.$[elem2].reply': req.body.reply } },
        { arrayFilters: [{ "elem.ID": parseInt(req.body.ARID) }, { "elem2.index": parseInt(req.body.index) }] },
        (err, document) => {
            if (err) return res.json(err);
        });
    res.json(req.body);
});
//使用者修改已回覆的AR
app.post('/sighting/:alino/reviseAR', upload.single(), (req, res) => {
    const sightingCollection = mongodb.collection('sighting');
    const queryCondition = { "ALINo": req.params.alino };

    sightingCollection.findOneAndUpdate(queryCondition,
        { $set: { 'ARList.$[elem].AR.$[elem2].reply': req.body.reply } },
        { arrayFilters: [{ "elem.ID": parseInt(req.body.ARID) }, { "elem2.index": parseInt(req.body.index) }] },
        (err, document) => {
            if (err) return res.json(err);
        });
    res.json(req.body);
});

//個人issue頁面


app.get('/sightingdashboard', async (req, res) => {
    const data = req.userData;
    // console.log(data);
    const sightingCollection = mongodb.collection('sighting');

    //列出working and close issue
    async function queryMany(queryWorking, queryClose, sightingrole, queryTransfer) {

        const working = await sightingCollection.find(queryWorking,
            { 'projection': { "priority": 1, "ALINo": 1, "title": 1, "status": 1, "category": 1, "project": 1, "createDate": 1 } })
            .toArray();
        const close = await sightingCollection.find(queryClose,
            { 'projection': { "priority": 1, "ALINo": 1, "title": 1, "status": 1, "category": 1, "project": 1, "createDate": 1 } })
            .toArray();
        //找出類別的案子分別issue的數量
        const projectRatio = await sightingCollection.aggregate([{ $match: { category: sightingrole } }, { '$group': { "_id": "$project", count: { "$sum": 1 } } }]).toArray()

        //request 轉過來的issue
        const requestTansfer = await sightingCollection.find(queryTransfer,
            { 'projection': { "ALINo": 1, "title": 1, "category": 1, "_id": 0, "transferTempComment": 1, "transferTemp": 1 } })
            .toArray();
        // console.log(requestTansfer);
        // console.log(close);
        data.working = working;
        data.close = close;
        data.wNUM = working.length;
        data.cNUM = close.length;
        data.WpageNum = Math.ceil(working.length / 10);
        data.CpageNum = Math.ceil(close.length / 10);
        data.projectRatio = projectRatio;
        data.requestTansfer = requestTansfer;
        // console.log(data);

    }
    // console.log(querySelectors);
    const queryWorking = {
        'phase': "NPI",
        'category': data.sightingrole,
        'status': "Working"
    };
    const queryClose = {
        'phase': "NPI",
        'category': data.sightingrole,
        'status': "Close"
    };
    const queryTransfer = {
        'transferTemp': data.sightingrole
    };
    await queryMany(queryWorking, queryClose, data.sightingrole, queryTransfer);
    await res.render('sightingDashboard', data);


});


app.post('/sightingdashboard', upload.single(), async (req, res) => {
    const data = req.userData;
    const queryCondition = { "ALINo": req.body.alino };
    const timeFormat = "YYYY-MM-DD HH:ss";
    const mo1 = moment(new Date());

    const sightingCollection = mongodb.collection('sighting');
    const userCollection = mongodb.collection('users');

    //send mail function
    function sendMail(mailOptions, consoleMSG) {
        transporter.sendMail(mailOptions, function (error, info) {
            if (error) {
                console.log(error);
            } else {
                console.log(consoleMSG);
            }
        })
    };
    //接受issue的function
    async function acceptIssue(queryCondition, transferData, newOwner) {
        const insertTransferHis = await sightingCollection.findOneAndUpdate(queryCondition,
            { '$push': { "transferHis": transferData } });

        const accept = await sightingCollection.findOneAndUpdate(queryCondition,
            { '$set': { "transfer": false, "transferTemp": "", "transferTempComment": "", "category": req.body.toCAT, "owner": newOwner } });
        await console.log(`${queryCondition.ALINo} Transfer success`);
    }

    //reject and send mail informing original owner
    async function rejectIssue(queryCondition, ownerAccount) {
        const reject = await sightingCollection.findOneAndUpdate(queryCondition,
            { '$set': { "transfer": false, "transferTemp": "", "transferTempComment": "" } });
    };

    //找出新舊owner

    async function findOldOwner(queryCondition) {
        const issueCAT = await sightingCollection.findOne(queryCondition,
            { 'projection': { "category": 1, "_id": 0 } });

        const owner = await userCollection.findOne({ 'sightingrole': issueCAT.category });
        return owner
    };
    async function findNewOwner(newCAT) {
        const owner = await userCollection.findOne({ 'sightingrole': newCAT });
        return owner
    };

    //舊的onwer 
    const oldOwner = await findOldOwner(queryCondition);
    const oldOwnerEmail = oldOwner.userEmail;
    const oldOwnerAccount = oldOwner.userAccount;

    //新的onwer 
    const newOwner = await findNewOwner(req.body.toCAT);
    const newOwnerAccount = newOwner.userAccount;

    if (req.body.reject) {

        const mailOptions = {
            from: 'alisunlcfc@gmail.com',
            to: `${oldOwnerEmail}`,
            subject: `[Sighting Inform] Issue ${queryCondition.ALINo} transfer request is rejected.`,
            html: `<h1 style='font-style: Calibri; background-color: #df1014;color :white;'> ALI No. ${queryCondition.ALINo}</h1>\                     
            <h2 style='font-style: Calibri;'>Result     :  Reject</h2>\
            <h2 style='font-style: Calibri;'>Comment    : ${req.body.comment}</h2>\ 
                        <h2 style='font-style: 微軟正黑體;'>http://10.158.150.248:3000/sighting/${queryCondition.ALINo}</h2>\
                        `
        };
        const consoleMSG = `${queryCondition.ALINo} transfer was rejected, already informed ${req.body.CAT} owner ${oldOwnerAccount}`;

        await rejectIssue(queryCondition);
        sendMail(mailOptions, consoleMSG);
        res.json(req.body);

    } else if (req.body.accept) {
        const transferData = {
            "from": req.body.CAT,
            "to": data.sightingrole,
            "date": mo1.format(timeFormat),
            "request": req.body.remark,
            "reply": req.body.comment
        };
        await acceptIssue(queryCondition, transferData, newOwnerAccount);
        const mailOptions = {
            from: 'alisunlcfc@gmail.com',
            to: `${oldOwnerEmail}`,
            subject: `[Sighting Inform] Issue ${queryCondition.ALINo} transfer request is accepted.`,
            html: `<h1 style='font-style: Calibri; background-color: #df1014;color :white;'> ALI No. ${queryCondition.ALINo}</h1>\                     
            <h2 style='font-style: Calibri;'>Result     :  Accept</h2>\
            <h2 style='font-style: Calibri;'>Comment    : ${req.body.comment}</h2>\ 
                        <h2 style='font-style: 微軟正黑體;'>http://10.158.150.248:3000/sighting/${queryCondition.ALINo}</h2>\
                        `
        };
        const consoleMSG = `${queryCondition.ALINo} transfer success, already informed original ${req.body.CAT} owner ${oldOwnerAccount}`;

        sendMail(mailOptions, consoleMSG);
        res.json(req.body);
    }
})

app.get('/sightingpersonaldashboard', async (req, res) => {
    const data = req.userData;
    console.log(data)
    res.render('sightingPersonalDashboard', data)
})
// 自定404 page
app.use((req, res) => {
    res.type('text/plain');
    res.status(404);
    res.send('404 - Page cannot found.');
});
