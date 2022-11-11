import fetch from "node-fetch";

import { createRequire } from "module";
const require = createRequire(import.meta.url);

const express = require('express')
const path = require("path");
const sessions = require('express-session');

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

var session;

app.use(sessions({
    secret: "thisisasecretstring",
    saveUninitialized: true,
    cookie: {maxAge : 1000000},
    resave: false
}));

var siteTitle = 'LionTrack'
var tempMessage = 'We hope you enjoy our demo :)'

app.listen(port, () => {
    console.log(`App listening at http://localhost:${port}`)
});

app.get("/", function(req,res){
    res.render("landing", {title:siteTitle, message:tempMessage,envelope:"default",responseMessage:""});
});

app.get("/login", function(req,res){
    res.render("login.ejs",{title: siteTitle, message: ""})
});

app.get("/student", function(req,res){
    res.render("index", {title:siteTitle, message:tempMessage,envelope:"default",responseMessage:""});
});

app.get("/landing", function(req,res){
    res.render("landing");
});

app.post('/test', (req, res) =>{
    console.log("inside /test");
    var parsedEmail = req.body.emailTest;
    console.log(parsedEmail)

    //do DB query
    if(parsedEmail.endsWith('.psu.edu') ){
        //do database query to get list of valid emails
        console.log('Getting list of students associated with the class that has generated the code')
    }

    //if parsed email matches email returned from the DB query, update the database and display the success message/email logo
    if(parsedEmail === 'bsp5205@psu.edu'){
        res.render("index", {title:siteTitle, message:tempMessage,envelope:"success",responseMessage:"Your attendance has been recorded!"});
    }else{  //if DB not updated, render the page with the !letter and a message saying the attendance update failed
        res.render("index", {title:siteTitle, message:tempMessage,envelope:"failure",responseMessage:"The email you have entered is invalid."});
    }
});

app.get("/attendance-:code", (req, res) => {
    let code = req.params.code;
    res.render("index", {title:siteTitle, message:tempMessage,envelope:"default",responseMessage: "The code you entered is"+code});
});

app.get("/selectClass", (req, res) => {
    res.render("selectClass.ejs",{title: siteTitle})
})

app.get("/courseOptions", (req, res) => {
    // console.log("inside /courseOptions");
    // console.log(req.params.course_id)
    let test_list = [{student_name: 'TestName1', student_attendance: '2/10'}, {student_name: 'TestName2', student_attendance: '3/10'}]

    res.render("courseOptions.ejs",{title: siteTitle,  student_list: test_list})
})

app.get("/generateCode-:code", (req, res) => {
    if(session){
        let code = req.params.code;
        let myBinary;
        const userAction = async () => {
            const response = await fetch('https://api.qrserver.com/v1/create-qr-code/?data={}&size=200x200'.replace('{}','http://localhost:3000/' + code));
            if (!response.ok) {
                throw new Error('Network response was not OK');
            }
            //myBinary = await response.text(); //extract binary from the http response
            //console.log(myBinary);
            console.log(response)
            console.log("Sent Binary");
            res.render("image.ejs", {title:siteTitle, url:response.url});
        }
        (async() => {
            await userAction()
        })()
    }else{
        res.render("rejection.ejs", {title:siteTitle});
    }
});

app.post("/authentication", (req, res) => {

    //pass in prof login from app
    let email = req.body.prof_email;
    let password = req.body.prof_pw;

    console.log(email + password)
    //check that username and password aren't empty
    if (email === "bsp5205@psu.edu" && password === "test"){
        //query the DB and check if login info matches

        //set the session object
        session = req.session;
        session.userid = email;
        res.render("selectClass.ejs",{title: siteTitle})
    }else{
        res.render("login.ejs",{title: siteTitle, message: "Incorrect credentials"})
    }

});

app.get("/getCourses", (req, res) => {



});



