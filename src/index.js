const express = require('express');
const multer = require('multer');
const fs = require('fs');
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


const app = express();
let { PythonShell } = require('python-shell')
app.set('view engine', 'ejs');
app.use(express.static('public'));

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
  
    mongodb = db
  
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

//login page
app.get('/user/login', (req, res) =>{
    res.render('login');
});
app.get('/user/register', (req, res) =>{
    res.render('register');
});

app.post('/user/register', function (req, res) {
    // const collection = mongodb.collection('users')
  
    // collection.insert({username: req.body.username, password: req.body.password}, function (err, result) {
    //   if (err) return res.json(err)
      res.json({
          message: "Success",
          data : req.query.useremail
        })
    // })
  })

app.get('/tlc', (req, res) =>{
    res.render('tlc');
});

app.post('/tlc', upload.single('tlcfile'), (req, res) =>{
    console.log(req.file);//req.files 報錯
    const files = {
        "data" : req.file,
        "project" : req.body.project,
    }
    res.json(files);
});


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


// 自定404 page
app.use((req, res)=>{
    res.type('text/plain');
    res.status(404);
    res.send('404 - Page cannot found.');
});