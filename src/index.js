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
    console.log('Server starts.')
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
        "path" : req.file.path,
    }
    res.json(files);

});


// app.post('/tlc', upload.single('tlcfile'),(req, res)=>{
//     // if (err) console.log(err);
//     // res.send({result:'success'});
//     console.log(req.file);
//     res.render('home',{
//         result: true,
//         uploadPic : '/tmp_uploads/' + req.file.filename,
//         uploadPicPath : req.file.path
//     })
// });


// 自定404 page
app.use((req, res)=>{
    res.type('text/plain');
    res.status(404);
    res.send('404 - Page cannot found.');
});