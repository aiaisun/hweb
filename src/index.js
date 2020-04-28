const express = require('express')
const multer = require('multer')
const fs = require('fs')

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



app.listen(3000, () => {
    console.log('Server starts')
})

app.get('/', (req, res) =>{
    res.render('home')
});

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

app.get('/tlc/parsetlc', pythonParseTLC)
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
function pythonParseTLC(req, res) {
    console.log("123")
    console.log(req.query.TLCFilePath);

    let options = {
        args: [
            req.query.TLCFilePath,
            req.query.project        
        ]
        
        //[1,2,3] //[1]
    }
    PythonShell.run('./pyfile/test.py', options, (err, data) => {
        if (err) res.send(err)
        const parsedString = JSON.parse(data)
        console.log(data);
        console.log(parsedString);
        // console.log(`name: ${parsedString.Name}, from: ${parsedString.From}`)
        res.json("OK")

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

}


// 自定404 page
app.use((req, res)=>{
    res.type('text/plain');
    res.status(404);
    res.send('404 - Page cannot found.');
});