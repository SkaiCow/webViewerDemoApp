var express = require('express');
var app = express();
var multer = require('multer');
var cors = require('cors');
var fs = require('fs');
var path = require('path');
var bodyParser = require('body-parser');
const { PDFNet } = require('@pdftron/pdfnet-node');

app.use(cors());
app.use(express.static("./public"));

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

var storage = multer.diskStorage({
      destination: function (req, file, cb) {
      cb(null, './public/files')
    },
    filename: function (req, file, cb) {
      cb(null, file.originalname)
    }
})

var upload = multer({ storage: storage }).single('file')

app.post('/upload',function(req, res) {
    upload(req, res, function (err) {
           if (err instanceof multer.MulterError) {
               return res.status(500).json(err)
           } else if (err) {
               return res.status(500).json(err)
           }
      return res.status(200).send(req.file)
    })
});

  if (!fs.existsSync('./public/files/xfdf')) {
    fs.mkdirSync('./public/files/xfdf');
  }

app.post('/save',function(req, res) {
    const xfdfFile = path.resolve(`./public/files/xfdf/${req.query.documentName}.xfdf`);
    try {
      res.status(200).send(fs.writeFileSync(xfdfFile, req.body.data));
    } catch(e) {
      res.status(500).send(`Error writing xfdf data to ${xfdfFile}`);
    }
    res.end();
});

app.get('/pdfs', function(req,res){
  let files = fs.readdir("./public/files",function(err, files)
  {
    res.send(files);
  })
})

app.get('/loadDoc', function(req,res){
  const xfdfFile = path.resolve(`./public/files/xfdf/${req.query.documentName}.xfdf`);
  if (fs.existsSync(xfdfFile)) {
    res.header('Content-Type', 'text/xml');
    let file = fs.readFileSync(xfdfFile);
    res.status(200).send(file);
  } else {
    res.status(204).send(`${xfdfFile} is not found.`);
  }
  res.end();
})

app.listen(8000, function() {

    console.log('App running on port 8000');

});
