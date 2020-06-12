
const express = require('express');
const app = express();
const multer = require('multer');
const fs = require('fs');
const utf8 = require('utf8');
const bodyParser = require('body-parser');
const session = require('express-session');
const tz = require('moment-timezone');
const moment = require ('moment');
const mongoClient = require('mongodb').MongoClient;
const mongo = 'mongodb://localhost:27017/hweb'
// const url = "mongodb://localhost:27017";
// Set a global variable for MongoDB
let mongodb = null
// // 連線mongodb
// client.connect(url, {useUnifiedTopology: true}, function(err, db){
//     if (err) throw err;
//     console.log("mongodb is connected.")
//     db.close()
    
// })
// var url1 = "mongodb://localhost:27017/hweb";
// client.connect(url1, {useUnifiedTopology: true}, function(err, db) {
//   if (err) throw err;
//   var dbo = db.db("hweb");
//   var myobj = { name: "Company Inc", address: "Highway 37" };
//   dbo.collection("customers").insertOne(myobj, function(err, res) {
//     if (err) throw err;
//     console.log("Collection created!");
//     db.close();
//   });
// });


let { PythonShell } = require('python-shell');
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());
app.use(session({
    saveUninitialized: false,
    resave: false,
    secret: '加密用的字串',
    cookie: {
        maxAge: 3600000, //一小時
    }
}))

// set the storage engine
const storage = multer.diskStorage({
    destination: 'public/tmpTLC/', //save path
    filename: function (req, file, cb){
        cb(null, file.originalname);
    }
});

//init upload
const upload = multer({storage: storage});//single image Key:myImage

// member system//
// Create a connect to MongoDB  Q 為什app要設在db 連接裡面
mongoClient.connect(mongo, {useUnifiedTopology: true}, function (err, db) {
    if (err) return console.log(err)
    mongodb = db.db("hweb");
    // mongodb = db
  
    // Start Service
    app.listen(3000, function () {
      console.log('Server Starts')
    })
  })

// app.listen(3000, () => {
//     console.log('Server starts')
// })

app.get('/', (req, res) =>{
    res.render('home')
});

app.get('/trysession', (req, res)=>{
    req.session.views = req.session.views || 0;
    req.session.views++;
    res.contentType('text/plain');
    res.write('拜訪次數:' + req.session.views + "\n");
    res.end( JSON.stringify(req.session));

})



//login page
app.get('/user/login', (req, res) =>{
    res.render('login');
});

app.post('/user/login', (req, res) =>{
    res.render('login');
});
//////////////////// 註冊流程 ////////////////////
app.get('/user/register', (req, res) =>{
    res.render('register');
});
app.get('/user/registerSuccess', (req, res) =>{
    res.render('registerSuccess');
});
//用next 試試
// var registerSuccess = function(req, res, next) {
//     const data={
//         userEmail: req.body.userEmail + "@lcfuturecenter.com",
//     }
//     console.log(`${data.userEmail} 註冊成功`);
//     next();
//   }
app.get('/try-finddb',(req,res)=>{
    const collection = mongodb.collection('users');
    const myemail = 'ali.sun@lcfuturecenter.com';
    let emailData = {'userEmail': myemail};
    collection.findOne({'userEmail': myemail}, (err, document) =>{
        console.log(document);
        // const data = document.name
        res.json(document);
    })
    
})

app.post('/user/register', upload.single('tlcfile'), (req, res) =>{
    // console.log('user in session')
    // console.log(req.session);
    const collection = mongodb.collection('users');
    const timeFormat = "YYYY-MM-DD HH:mm:ss";
    const mo1 = moment(new Date());

    //檢查有沒有這個帳號 有的話再insert     
    let account = {'userAccount': req.body.userAccount};
   
    collection.findOne( account, (err, document) =>{
        
        if (document){
            console.log(`${document.userAccount} 在 ${document.create_date}已註冊過帳號`);
            res.json({alert: "帳號已存在"})//json字串過去一定要json格式再.出來
        } else{
            let insertDate = {
                'userCName'  : req.body.userCName,
                'userEName'  : req.body.userEName,
                'userAccount': req.body.userAccount,
                'userEmail'  : req.body.userAccount + "@lcfuturecenter.com",
                'userPW'     : req.body.userpassword,
                'create_date': mo1.format(timeFormat),
            }
            collection.insertOne(insertDate, function (err, document) {
              if (err) return res.json(err);
          
              console.log(`${account.userAccount} 註冊成功`);
            //   res.redirect('registerSuccess');
              res.json({alert: "帳號註冊成功"})
            })
        }
    })
  })

//////////////////// 註冊流程 ////////////////////


//////////////////// TLC 部分 ////////////////////
app.get('/tlc', (req, res) =>{
    res.render('tlc');
});

app.post('/tlc', upload.single('tlcfile'), (req, res) =>{
    console.log(req.file);//req.files 報錯
    const files = {
        "data" : req.file,
        "project" : req.body.project
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
    PythonShell.run('./pyfile/parseIO_v7.py', options, (err, data) => {
        if (err) res.send(err)
        const parsedString = JSON.parse(data)
        // console.log(data);
        // console.log(parsedString);
        console.log("Parsed Successfully");
        res.json(parsedString)

    })

    // PythonShell.run('./photocategory.py', options, (err, result) => {
    //     if (err) res.send(err)
    //     const parsedString = JSON.parse(result)
    //     // console.log(result);
    //     // console.log(parsedString);
    //     // console.log(`name: ${parsedString.Name}, from: ${parsedString.From}`)
    //     console.log(parsedString)
    //     res.json(parsedString)

    // })

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
        console.log("Parsed Successfully");
        res.json(parsedString)

    })
};

//////////////////// TLC ////////////////////


app.get('/user/test', (req, res) =>{
    res.render('test2');
});



app.post('/user/test', (req, res) =>{
    const testQQ = {
        "data": req.body
    }
    res.json(testQQ);
});

// app.post('/user/test', upload.single('tlcfile'), (req, res) =>{
//     const testQQ = {
//         "data": req.body
//     }
//     res.json(testQQ);
// });





// 自定404 page
app.use((req, res)=>{
    res.type('text/plain');
    res.status(404);
    res.send('404 - Page cannot found.');
});