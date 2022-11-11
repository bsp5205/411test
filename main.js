import fetch from "node-fetch";

import { createRequire } from "module";
const require = createRequire(import.meta.url);

//normal express app setup
const express = require('express')
const path = require("path");
const sessions = require('express-session');

const app = express();
const port = 3000;

//used to store and retrieve values from URLs
var bodyParser = require('body-parser')
app.use(bodyParser.urlencoded({extended: false}));

//imports
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

//set the location of the views
app.set("views",path.resolve(__dirname,"views"));
app.set("view engine","ejs");

//used to track authentication
var session;
app.use(sessions({
    secret: "thisisasecretstring",
    saveUninitialized: true,
    cookie: {maxAge : 1000000},
    resave: false
}));

//title and message used in templating engine
var siteTitle = 'LionTrack';
var tempMessage = 'We hope you enjoy our demo :)';

//added here for ease of use (click the link in the console)
app.listen(port, () => {
    console.log(`App listening at http://localhost:${port}`);
});

//landing page endpoint
app.get("/", function(req,res){
    res.render("landing", {title:siteTitle, message:tempMessage,envelope:"default",responseMessage:""});
});

//login endpoint
app.get("/login", function(req,res){
    res.render("login.ejs",{title: siteTitle, message: ""});
});

//student endpoint
app.get("/student", function(req,res){
    res.render("index", {title:siteTitle, message:tempMessage,envelope:"default",responseMessage:""});
});

//landing page endpoint
app.get("/landing", function(req,res){
    res.render("landing");
});

//this endpoint is connected to the form in the attendance page. It gets the student email, checks if it is in the course DB, and then updates the attendance
app.post('/test', (req, res) =>{
    //get the email from the form
    var parsedEmail = req.body.emailTest;

    //do DB query - this if statement is temporary
    if(parsedEmail.endsWith('.psu.edu') ){
        //do database query to get list of valid emails
        console.log('Getting list of students associated with the class that has generated the code');
    }

    //if parsed email matches email returned from the DB query, update the database and display the success message/email logo
    if(parsedEmail === 'bsp5205@psu.edu'){
        //render the page w/ success message
        res.render("index", {title:siteTitle, message:tempMessage,envelope:"success",responseMessage:"Your attendance has been recorded!"});
    }else{  //if DB not updated, render the page with the !letter and a message saying the attendance update failed
        //render the page w/ failure message
        res.render("index", {title:siteTitle, message:tempMessage,envelope:"failure",responseMessage:"The email you have entered is invalid."});
    }
});

//this is the endpoint which will be requested by the student when the QR code is scanned
app.get("/attendance-:code", (req, res) => {
    //get the code passed in the URL
    let code = req.params.code;

    //render the page with the code (for testing/demo)
    res.render("index", {title:siteTitle, message:tempMessage,envelope:"default",responseMessage: "The code you entered is"+code});
});

app.get("/selectClass", (req, res) => {
    res.render("selectClass.ejs",{title: siteTitle});
})

//this endpoint will query the DB for the specified course and pass a list of students to the front end
app.get("/courseOptions", (req, res) => {
    //query DB for students in the course using the course_id

    //test_list is filled w/ dummy data to test the table generation
    let test_list = [{student_name: 'TestName1', student_attendance: '2/10'}, {student_name: 'TestName2', student_attendance: '3/10'}];

    //render the course with the list of students from the DB
    res.render("courseOptions.ejs",{title: siteTitle,  student_list: test_list})
})

//this endpoint will generate the QR code using the API and then pass the image to the front end
app.get("/generateCode-:code", (req, res) => {
    if(session){ //check if session is defined - if yes, then the professor is logged in

        //get the code from the URL
        let code = req.params.code;

        //QR code api call
        const userAction = async () => {
            const response = await fetch('https://api.qrserver.com/v1/create-qr-code/?data={}&size=200x200'.replace('{}','http://localhost:3000/' + code));
            if (!response.ok) {
                throw new Error('Network response was not OK');
            }

            //render the page with the QR code
            res.render("image.ejs", {title:siteTitle, url:response.url});
        }
        (async() => {
            await userAction();
        })()
    }else{
        //reject the request because only faculty members may generate QR codes
        res.render("rejection.ejs", {title:siteTitle});
    }
});

//this endpoint is connected to the form in the login page. It gets the info entered, and then will query the DB to check the credentials
app.post("/authentication", (req, res) => {
    //pass in prof login from app
    let email = req.body.prof_email;
    let password = req.body.prof_pw;
    console.log(email + " " + password);
    //check that username and password aren't empty
    if (email === "bsp5205@psu.edu" && password === "test"){
        //query the DB and check if login info matches

        //set the session object
        session = req.session;
        session.userid = email;

        //query the DB and pull a list of the faculty member's courses

        //render the professor's list of courses
        res.render("selectClass.ejs",{title: siteTitle});
    }else{
        //render the rejection as the login credentials are incorrect
        res.render("login.ejs",{title: siteTitle, message: "Incorrect credentials"});
    }
});

app.get("/getCourses", (req, res) => {

});



