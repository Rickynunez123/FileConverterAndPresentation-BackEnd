const express = require('express');
const upload = require('express-fileupload');
const pptx2pdf = require('pptx2pdf');
const zipLocal = require('zip-local');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const { send } = require('process');
const util = require('util');

const app = express();

//middleware
app.use(cors());
app.use(upload());
app.use(express.static('public'));

//get images
app.use('/result', express.static('result'));

//allowing to connect to the server
app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "http://localhost:8080");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
  });


//getting the uploaded file 
app.post('/', async (req, res) => {
    if(req.files){
        //getting the data send by the user 
        const file = req.files.file;
        let folderName = req.body.folderName;
        //storing the uploaded file
        const filenameWSpace = file.name;
        const filename = filenameWSpace.replace(/ /g, '_').replace(/&/g, 'and');
        
        //if the user does not provide a name
        if(folderName === ""){
            folderName = filename.split('.')[0];
        }
        console.log("backend:" + folderName);

        //move uploaded file to upload folder
        const mvPromise = util.promisify(file.mv);

        const result = file.mv('./upload/' + filename, function(err){
            if(err){
                console.log(err);
            } else{
               p = new Promise(( resolve, reject ) => {
                    const folderPath = path.join(__dirname, 'public/result', folderName);
                    //checking if the given folder already exists
                    if(fs.existsSync(folderPath)){
                        console.log("Folder with the given name already exists");
                        res.status(409).json({ error: "Folder with the given name already exists"});
                        //send an error to the user
                        return;
                    }
                    else{
                        //creating folder
                    fs.mkdir(folderPath, {recursive: true}, (err) => {
                        if(err){
                            console.log(err);
                            return;
                        }
                        console.log(`Folder "${folderName} created!`)
                    });
                };
                    //changing to png 
                    try{
                        resolve(pptx2pdf.run(`npx pptx2pdf ./upload/${filename} -r --png -o ./public/result/${folderName}`))
                        console.log("Preparing files");
                    } catch(error){
                        console.log(error);
                    }
                })
                p.then( result => zipLocal.sync.zip(`public/result/${folderName}`).compress().save("my-files.zip"))
                p.then( result => res.sendStatus(200));               
            }
        })
    }
});


//get zip file 
app.get('/download', (req, res) => {
    const file = path.join(__dirname,'my-files.zip')
    res.download( file);
});


//Show all folders
app.get('/folders', (req, res) => {
const directoryPath = path.join(__dirname, 'public/result/');
fs.readdir(directoryPath, async (err, files) => {
    if (err) {
      return console.log('Unable to scan directory: ' + err);
    } 
    const foldersPag = files.filter(file => fs.lstatSync(path.join(directoryPath, file)).isDirectory());

    const {limit = 100, offset = 1} = req.query;

    const folders = paginate(foldersPag,limit, offset);
    // console.log(folders)
    res.send({folders});
  });
});

//everything about the folders 
app.get('/foldersInfo', (req, res) => {
    //return an array of all the folders 
    const directoryPath = path.join(__dirname, 'public/result/');
    fs.readdir(directoryPath, async (err, files) => {
            if (err) {
              return console.log('Unable to scan directory: ' + err);
            } 
            const folders = files.filter(file => fs.lstatSync(path.join(directoryPath, file)).isDirectory());
            let resultFolders = {};
            for (const folder of folders) {
            let folderPath = path.join(directoryPath, folder);
            let folderFiles = await fs.promises.readdir(folderPath);
            resultFolders[folder] = folderFiles;
        }
        res.send({resultFolders});
    });
  });
  
 

function paginate(array, page_size, page_number) {
    // human-readable page numbers usually start with 1, so we reduce 1 in the first argument
    return array.slice((page_number - 1) * page_size, page_number * page_size);
  }


//get request to get specific slides - one by one 
app.get('/img', (req, res) => {
    //1. when clicking in any specific folder return the folderName 
    const {folderName} = req.query;
    //console.log(folderName);

    fs.readdir(`./public/result/${folderName}`, async (err, files) => {
        if (err) {
            res.send(err);
          }
          //pagination, give two slided at a time 
          //limit: the number of pictures you want to display in one page
          //offset: the number you want to skip
          const {limit = 1, offset = 1} = req.query;

          //getting all images in the folder
          const pngFilesBef = files.filter(file => file.endsWith('.png'));

          const pngFiles = paginate(pngFilesBef,limit, offset);


          res.send({pngFiles});
        });
});


//return complete folder 
app.get('/', (req, res) => {
    //1. when clicking in any specific folder return the folderName 
    const {folderName} = req.query;
    //console.log(folderName);

    fs.readdir(`./public/result/${folderName}`, async (err, files) => {
        if (err) {
            res.send(err);
          }

          res.send({files});
        });
});



//environment variable  PORT
//if the environment variable is set, we will use it, otherwise we use port 3001
const port  = process.env.PORT || 3001;

app.listen(port, () => {
    console.log(`Listening in port ${port}...`)
});