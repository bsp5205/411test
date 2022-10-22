import fetch from "node-fetch";

import { createRequire } from "module";
const require = createRequire(import.meta.url);

const express = require('express')
const path = require("path");

const app = express();
const port = 3000;

var bodyParser = require('body-parser')
app.use(bodyParser.urlencoded({extended: false}));

import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

app.set("views",path.resolve(__dirname,"views"));
app.set("view engine","ejs");

var siteTitle = 'LionTrack'
var tempMessage = 'Adderall goes crazy (part 2)'

app.listen(port, () => {
    console.log(`App listening at http://localhost:${port}`)
});

app.get("/", function(req,res){
    res.render("index", {title:siteTitle, message:tempMessage,envelope:"default",responseMessage:""});
});

app.post('/test', (req, res) =>{
    console.log("inside /test");
    var parsedEmail = req.body.emailTest;
    console.log(parsedEmail)

    if(parsedEmail === 'bsp5205@psu.edu'){  //if DB updated successfully, render the page with the checkbox letter
        res.render("index", {title:siteTitle, message:tempMessage,envelope:"success",responseMessage:"Your attendance has been recorded!"});
    }else{  //if DB not updated, render the page with the !letter and a message saying the attendance update failed
        res.render("index", {title:siteTitle, message:tempMessage,envelope:"failure",responseMessage:"You put in an invalid email dumbass..."});
    }
});

app.get("/attendance-:code", (req, res) => {
    console.log("inside /attendance");
    console.log(req.params.code)
    res.render("index", {title:siteTitle, message:tempMessage,envelope:"success",responseMessage:"Passed through attendance - this is a temp render to test the dynamic code"});
});

app.get("/generateCode-:code", (req, res) => {
    let code = req.body.code
    console.log(code);

    const userAction = async () => {
        const response = await fetch('https://api.qrserver.com/v1/create-qr-code/?data={}&size=100x100'.replace('{}',code));
        const myJson = await response.json(); //extract JSON from the http response
        // do something with myJson
        console.log(myJson);
    }

    (async() => {
        console.log('1')
        await userAction()
        console.log('2')
    })()

    res.render("index", {title:siteTitle, message:tempMessage,envelope:"success",responseMessage:"Passed through generateCode - this is a temp render to test QR code API"});
});


