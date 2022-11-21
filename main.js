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
import {response} from "express";

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

app.get("/studentCode", function(req,res){
    res.render("studentCode.ejs", {title:siteTitle, wrong:""})
})

//landing page endpoint
app.get("/landing", function(req,res){
    res.render("landing");
});

app.post("/codeTest", function(req,res){
    var parsedCode = req.body.codeTest;
    console.log(parsedCode);
    if(parsedCode == 5){
        res.render("index", {title:siteTitle, message:tempMessage,envelope:"default",responseMessage:""});
    }else{
        res.render("studentCode.ejs", {title: siteTitle, wrong:"The code you have entered is invalid"})
    }
})
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
app.get("/courseOptions-:course_id", (req, res) => {
    //get the course id from URL
    let course_id = req.params.course_id;
    course_id = course_id.replace(':', '');
    console.log(course_id);
    //query DB for students in the course using the course_id


    //test_list is filled w/ dummy data to test the table generation
    let test_list = [];
    if(course_id === '00001'){
        test_list = [{student_name: 'TestName1', student_attendance: '2/10'}, {student_name: 'TestName2', student_attendance: '9/10'}];
    }else if (course_id === '00002'){
        test_list = [{student_name: 'TestName3', student_attendance: '5/10'}, {student_name: 'TestName4', student_attendance: '0/10'}];
    }else if (course_id === '00003'){
        test_list = [{student_name: 'TestName5', student_attendance: '1/10'}, {student_name: 'TestName6', student_attendance: '7/10'}];
    }

    course_id = course_id.toString()

    let test_list_2 = [{id: course_id}]
    //render the course with the list of students from the DB
    res.render("courseOptions.ejs",{title: siteTitle,  student_list: test_list, course_id_value: test_list_2})
})

//this endpoint will generate the QR code using the API and then pass the image to the front end
app.get("/generateCode-:course_id", (req, res) => {
    if(session){ //check if session is defined - if yes, then the professor is logged in

        let course_id = req.params.course_id;

        //generate the code
        let code = Math.floor(100000 + Math.random() * 900000)

        //update the course-code DB table with the active code using the course_id passed in the URL

        //QR code api call
        const userAction = async () => {
            const response = await fetch('https://api.qrserver.com/v1/create-qr-code/?data={}&size=200x200'.replace('{}','http://localhost:3000/' + code));
            if (!response.ok) {
                throw new Error('Network response was not OK');
            }

            //render the page with the QR code
            res.render("image.ejs", {title:siteTitle, url:response.url, code:code});
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

        //temp list
        let prof_course_list = [{course_name: 'Course 1', course_id: '00001'}, {course_name: 'Course 2', course_id: '00002'}, {course_name: 'Course 3', course_id: '00003'}];

        //render the professor's list of courses
        res.render("selectClass.ejs",{title: siteTitle, course_list: prof_course_list});
    }else{
        //render the rejection as the login credentials are incorrect
        res.render("login.ejs",{title: siteTitle, message: "Incorrect credentials"});
    }
});

app.get("/create", (req, res) => {
    res.render("create.ejs",{title: siteTitle, message: ""});
});

app.post("/create_prof_account", (req, res) => {
    let email = req.body.prof_email;
    let password = req.body.prof_pw;
    let password_confirm = req.body.prof_pw_confirm;
    let access_token = req.body.prof_access_token;

    // console.log(email);
    // console.log(password);
    // console.log(password_confirm);
    // console.log(access_token);

    if(email && password && password_confirm){
        if(password === password_confirm){
            //query DB to check if email is already linked to an account
            // if there is not an account, then add it into the DB 'professor table' (PK = professor email, password, and access token)

            //get the list of courses associated w/ the access token
            let courses_url = 'https://canvas.instructure.com/api/v1/courses?access_token={}&per_page=100'.replace('{}', '')
            fetch(courses_url)
                .then(response => response.json())
                .then(data => {
                    //create a table with (PK = (email, course id))
                    //create a table for each course (PK = course ID, student name, attendance score)
                });

            //get a list of professor courses from the DB using the professor's email

            //use the list of courses (id will be there) to pull a list of students
            // let student_list_url = 'https://canvas.instructure.com/api/v1/courses/{}?access_token={}&per_page=100'.replace('{}', data[i].id).replace('{}','')
            // fetch(student_list_url).then(response => response.json())
            //     .then(data => {
            //         //fill course tables here
            //         console.log(data)
            //     });

        }else{
            res.render("create.ejs",{title: siteTitle, message: "Passwords do not match"});
        }
    }else{
        res.render("create.ejs",{title: siteTitle, message: "Missing information"});
    }
});


app.get("/updateCourses", (req, res) => {
    // get list of prof courses from DB

    // use the canvas API to pull a list of students from each course

    // temp list
    let prof_course_list = [{course_name: 'Course 1', course_id: '00001'}, {course_name: 'Course 2', course_id: '00002'}, {course_name: 'Course 3', course_id: '00003'}];
    res.render("selectClass.ejs",{title: siteTitle, course_list: prof_course_list});
});