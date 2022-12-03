import fetch from "node-fetch";

import { createRequire } from "module";
const require = createRequire(import.meta.url);

//normal express app setup
const express = require('express');
const mysql = require('mysql');
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
import { config } from "process";

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

var access_token = "";

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

//database connection
const con = mysql.createConnection({
    host     : 'liontrack-db.ca47foqbcglj.us-east-2.rds.amazonaws.com',
    port     : '3306',
    user     : 'admin',
    password : 'password'
});
  
con.connect(function(err) {
    if (err) throw err;
    console.log("Connected!");
});

//this endpoint is connected to the form in the attendance page. It gets the student email, checks if it is in the course DB, and then updates the attendance
app.post('/test', (req, res) =>{
    //get the email from the form
    var parsedEmail = req.body.emailTest;

    con.query('SELECT * FROM sys.temp_table WHERE email = ?', [parsedEmail], function(error, results, fields){
        if (error) throw error
        if (results.length > 0){
            con.query('UPDATE sys.temp_table set attendance = ? WHERE email = ?', [results[0]['attendance'] + 1, results[0]['email']], function(error, update_results, fields){
                if (error) throw error
                console.log('Updated', update_results.affectedRows, 'rows')
                if (update_results.affectedRows > 0){
                    let msg = "Your attendance has been updated to: " + String(results[0]['attendance'] + 1)
                    res.render("index", {title:siteTitle, message:tempMessage,envelope:"success",responseMessage:"Your attendance has been recorded!"});
                }else{
                    res.render("index", {title:siteTitle, message:tempMessage,envelope:"failure",responseMessage:"The email you have entered is invalid."});
                }
            })
        }
    })

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
        let code = Math.floor(100000 + Math.random() * 900000);
        //generate the code
        console.log("code = " + code)
        course_id = course_id.replace(':', '')
        let temp = parseInt(course_id, 10)
        console.log("course_id = "+ (temp + 1))
        con.query('SELECT * FROM sys.course_code where course_id = ?',[temp], function(error, courses, fields){
            if(error) throw error
            console.log("courses ")
            console.log(courses)
            con.query('UPDATE sys.course_code SET code =? WHERE course_id =?', [code, course_id], function(err, test){
                console.log("test ")
                console.log(test)
            })
        })
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
    if (email && password){//if an email and password are entered query for email in the DB
        con.query('SELECT * FROM sys.professor WHERE professor_email = ?', [email], function(error, results, fields){
            if (error) throw error
            console.log(results)
            if (results.length > 0){//if the DB returns anything
                if (results[0]['professor_password'] === password){//check if passwords match then query for courses
                    session = req.session;
                    session.userid = email;
                    con.query('SELECT * FROM sys.course_test WHERE professor_id =?', [results[0]['professor_id']], function(error, result, fields){
                        console.log(result)
                        let input = [];//set empty array
                        for (let i = 0; i < result.length; i++){//for loop to generate all items in the list of courses
                            let test =  {course_name: result[i]['course_name'], course_id: result[i]['course_id'], section_number: result[i]['section_number']};
                            input.push(test)
                        }
                        console.log(input)//render new page
                        res.render("selectClass.ejs",{title: siteTitle, course_list: input});
                    })
                }else{
                    res.render("login.ejs",{title: siteTitle, message: "Incorrect credentials"});
                }
            }else{
                res.render("login.ejs",{title: siteTitle, message: "Incorrect credentials"});
            }
        })
    } else{
        res.render("login.ejs",{title: siteTitle, message: "Incorrect credentials"});
    }

});

app.get("/create", (req, res) => {
    res.render("create.ejs",{title: siteTitle, message: ""});
});

//end point that creates the account for the professor
app.post("/create_prof_account", (req, res) => {
    let email = req.body.prof_email;
    let password = req.body.prof_pw;
    let password_confirm = req.body.prof_pw_confirm;
    let current_term = '202223FA'
    //if the values are defined
    if(email && password && password_confirm){
        //if the passwords are the same
        if(password === password_confirm){
            //query DB to check if email is already linked to an account
            //if there is not an account, then add it into the DB 'professor table' (PK = professor email, password, and access token)
            con.query('SELECT * FROM sys.professor WHERE email = ?', [email], function(error, results, fields){
                if (error) throw error
                if (results.length === 0) {
                    con.query('INSERT INTO professor (professor_email, professor_password) VALUES (?,?)', [email, password])
                    //render a page that accepts a canvas access token here
                    res.render("accessToken.ejs",{title: siteTitle, course_list: input});
                }
            })
        }else{
            //render the creation page if the passwords don't match
            res.render("create.ejs",{title: siteTitle, message: "Passwords do not match"});
        }
    }else{
        //render the creation page if the passwords don't match
        res.render("create.ejs",{title: siteTitle, message: "Missing information"});
    }
});

//allows prof to manually update the courses
app.get("/updateCourses", (req, res) => {
    // get list of prof courses from DB

    // use the canvas API to pull a list of students from each course

    // temp list
    let prof_course_list = [{course_name: 'Course 1', course_id: '00001'}, {course_name: 'Course 2', course_id: '00002'}, {course_name: 'Course 3', course_id: '00003'}];
    res.render("selectClass.ejs",{title: siteTitle, course_list: prof_course_list});
});

app.get("/AccessToken", (req, res) => {
    res.render("accessToken.ejs",{title: siteTitle});
});

app.post("/takeAccessToken", (req, res)=>{
    access_token = req.body.access_token
    //get the list of courses associated w/ the access token
    let courses_url = 'https://canvas.instructure.com/api/v1/courses?access_token={}&per_page=100&include[]=term'.replace('{}', access_token)
    const response = fetch(courses_url)
        .then(response => response.json())
        .then(data => {
            //create a table with (PK = (email, course id))
            //create a table for each course (PK = course ID, student name, attendance score)

            //parse course data
            for(let course = 0; course < data.length; course++){
                if(data[course]['id'] && data[course]['name'] && data[course]['term']['name'].includes(current_term)){
                    console.log('---------- course:',course,'----------')
                    console.log(data[course]['id'])
                    console.log(data[course]['name'])
                    console.log(data[course]['term']['name'])
                    console.log('')
                }
            }

        });

    //get a list of professor courses from the DB using the professor's email

    //use the list of courses (id will be there) to pull a list of students
    let student_list_url = 'https://canvas.instructure.com/api/v1/courses/{}/students/?access_token={}&per_page=100'.replace('{}', '10500000002193258').replace('{}',access_token)
    fetch(student_list_url).then(response => response.json())
        .then(data => {

            //parse student data
            for(let student = 0; student < data.length; student++){
                if(data[student]['id'] && data[student]['name']){
                    console.log('\t---------- student:',student,'----------')
                    console.log('\t',data[student]['id'])
                    console.log('\t',data[student]['name'])
                    console.log('')
                }
            }
        });

})