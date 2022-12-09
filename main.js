import fetch from "node-fetch";

import { createRequire } from "module";
const require = createRequire(import.meta.url);

//normal express app setup
const express = require('express');
const mysql = require('mysql');
const path = require("path");
const sync_fetch = require('sync-fetch')
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
var current_term = '202223FA'

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
    res.render("index", {title:siteTitle, message:tempMessage,envelope:"default",responseMessage:"", course_id:""});
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

    con.query('SELECT * FROM sys.course where course_code = ?',[parsedCode], function(error, results, fields){

        if(error) throw error
        if(results.length > 0){
            res.render("index", {title:siteTitle, message:tempMessage,envelope:"default",responseMessage:"", course_id:results[0]['course_id']});
        }else{
            res.render("studentCode.ejs", {title: siteTitle, wrong:"The code you have entered is invalid"})
        }
    })

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
app.post('/test-:course_id', (req, res) =>{
    var passed_name = req.body.nameTest; //get the email from the form
    let course_id = req.params.course_id //get the course_id from the URL
    course_id = course_id.replace(':', ''); //remove the :

    //query enrollment for course id passed in
    con.query('SELECT * FROM sys.enrollment WHERE course_id = ? AND student_name = ?', [course_id, passed_name], function(error, results, fields){
        if (error) throw error

        //query course for course_code
        con.query('SELECT * FROM sys.course WHERE course_id = ?', [course_id], function(error, results2, fields){
            if (error) throw error

            if(results2[0]['course_code'] !== '000000'){  //check if the course code is still open for submission
                if (results.length > 0){

                    //update enrollment attendance for the passed course_id and student name
                    con.query('UPDATE sys.enrollment set attendance_score = ? WHERE student_name = ? AND course_id = ?', [results[0]['attendance_score'] + 1, results[0]['student_name'], results[0]['course_id']], function(error, update_results, fields){
                        if (error) throw error

                        if (update_results.affectedRows > 0){ //if a row has been updated, then the passed name is in the course
                            let msg = "Your attendance has been updated to: " + String(results[0]['attendance_score'] + 1) + '/' + String(results[0]['attendance_total'])

                            //set the student's attendance flag to 1, so they cannot submit it more than once in a given day
                            con.query('UPDATE sys.enrollment SET submitted = ? WHERE course_id = ? AND student_name = ?', [1, course_id, passed_name], function(err, test){
                                setTimeout ( function(){

                                    //set the student's attendance submitted flag to 0, so they can submit again the next day
                                    con.query('UPDATE sys.enrollment SET submitted = ? WHERE course_id = ? AND student_name = ?', [0, course_id, passed_name], function(err, test){
                                    })
                                }, 60*60*1000);
                            })
                            res.render("index", {title:siteTitle, message:tempMessage,envelope:"success",responseMessage:msg,course_id:""});
                        }else{
                            res.render("index", {title:siteTitle, message:tempMessage,envelope:"failure",responseMessage:"The name you have entered is invalid.",course_id: course_id});
                        }
                    })
                }else{
                    res.render("index", {title:siteTitle, message:tempMessage,envelope:"failure",responseMessage:"The name you have entered is invalid.",course_id: course_id});
                }
            }
        })
    })
});

//this is the endpoint which will be requested by the student when the QR code is scanned
app.get("/attendance-:code", (req, res) => {
    //get the code passed in the URL
    let code = req.params.code
    //render the page with the code (for testing/demo)
    res.render("index", {title:siteTitle, message:tempMessage,envelope:"default",responseMessage: "The code you entered is"+code, course_id:""});
});

app.get("/selectClass", (req, res) => {
    res.render("selectClass.ejs",{title: siteTitle});
});

//this endpoint will query the DB for the specified course and pass a list of students to the front end
app.get("/courseOptions-:course_id", (req, res) => {
    let course_id = req.params.course_id; //get the course id from URL
    course_id = course_id.replace(':', ''); //remove :
    let input = []

    //query DB for students in the course using the course_id
    con.query('SELECT * FROM sys.enrollment WHERE course_id = ?', [course_id], function(error, results, fields){

        for(let student = 0; student < results.length; student++){ //create a list of students from the DB result set
            let test_student =  {student_name: results[student]['student_name'], attendance_score: results[student]['attendance_score'], attendance_total: results[student]['attendance_total']};
            input.push(test_student)
        }

        //get course list from DB
        con.query('SELECT * FROM sys.course WHERE course_id = ?', [course_id], function(error, results2, fields){
            course_id = course_id.toString()
            console.log(results2[0]['course_name'])
            let test_list_2 = [{id: course_id, name:results2[0]['course_name']}]

            //render the course with the list of students from the DB
            res.render("courseOptions.ejs",{title: siteTitle,  student_list: input, course_id_value: test_list_2})
        })

    })
})

//this endpoint will generate the QR code using the API and then pass the image to the front end
app.get("/generateCode-:course_id", (req, res) => {
    if(session){ //check if session is defined - if yes, then the professor is logged in
        let course_id = req.params.course_id; //get course_id from URL
        let code = Math.floor(100000 + Math.random() * 900000); //generate 6 digit code of rand numbers
        course_id = course_id.replace(':', '') //remove the :
        let temp = parseInt(course_id, 10)

        //query DB for
        con.query('SELECT * FROM sys.course_code where course_id = ?',[temp], function(error, courses, fields){
            if(error) throw error

            con.query('UPDATE sys.course_code SET code = ? WHERE course_id = ?', [code, course_id], function(err, test){})
            con.query('UPDATE sys.course SET course_code = ? WHERE course_id = ?', [code, course_id], function(err, test){})

            //query db for enrollment in course w/ id course_id
            con.query('SELECT * FROM sys.enrollment WHERE course_id = ?', [course_id], function(error, results, fields){
                //console.log(results)
                if (error) throw error
                if (results.length > 0){
                    for(let result = 0; result < results.length; result++){
                        con.query('UPDATE sys.enrollment set attendance_total = ? WHERE student_name = ? AND course_id = ?', [results[result]['attendance_total'] + 1, results[result]['student_name'], results[result]['course_id']], function(error, update_results, fields){
                            if (error) throw error
                        })
                    }
                }
            })
        })

        //QR code api call
        const userAction = async () => {
            const response = await fetch('https://api.qrserver.com/v1/create-qr-code/?data={}&size=200x200'.replace('{}','http://localhost:3000/-:' + code));
            if (!response.ok) {
                throw new Error('Network response was not OK');
            }
            //render the page with the QR code
            res.render("image.ejs", {title:siteTitle, url:response.url, code:code});
        }
        (async() => {
            await userAction();
        })()
        //set the timeout to remove the 6 digit code from the db
        setTimeout ( function(){
            con.query('UPDATE sys.course SET course_code = ? WHERE course_id = ?', [0, '000000'], function(err, test){
            })
        }, 60*60*12*1000);
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
            //console.log(results)
            if (results.length > 0){//if the DB returns anything
                if (results[0]['professor_password'] === password){//check if passwords match then query for courses
                    session = req.session;
                    session.userid = email;
                    con.query('SELECT * FROM sys.course WHERE prof_email = ?', [email], function(error, result, fields){
                        //console.log(result)
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
    let access_token = req.body.prof_access_token;
    var id_list = []
    var student_list = []
    var enroll_list = []
    console.log(access_token)
    //if the values are defined
    if(email && password && password_confirm){
        //if the passwords are the same
        if(password === password_confirm){

            //query DB to check if email is already linked to an account
            //if there is not an account, then add it into the DB 'professor table' (PK = professor email, password, and access token)
            con.query('SELECT * FROM sys.professor WHERE professor_email = ?', [email], function(error, results, fields){
                if (error) throw error
                if (results.length === 0) {

                    //add professor account info
                    con.query('INSERT INTO sys.professor (professor_email, professor_password, access_token) VALUES (?,?,?)', [email, password, access_token])
                    let courses_url = 'https://canvas.instructure.com/api/v1/courses?access_token={}&per_page=100&include[]=term'.replace('{}', access_token)
                    const course_api_data = sync_fetch(courses_url, {}).json()

                    //for each course:
                    for(let i = 0; i < course_api_data.length; i++){

                        //if the course is public and part of the current term
                        if(course_api_data[i]['id'] && course_api_data[i]['name'] && course_api_data[i]['term']['name'].includes(current_term)) {
                            //insert course into table
                            con.query('INSERT INTO sys.course (course_id, prof_email, course_name, section_number) VALUES (?,?,?,?)', [course_api_data[i]['id'], email, course_api_data[i]['name'], 0])

                            //synchronous API call
                            let student_list_url = 'https://canvas.instructure.com/api/v1/courses/{}/students/?access_token={}&per_page=100'.replace('{}', course_api_data[i]['id']).replace('{}', access_token)
                            const student_list_api_data = sync_fetch(student_list_url, {}).json()
                            for(let j = 0; j < student_list_api_data.length; j++){
                                //console.log(student_list_api_data[j]['id'], student_list_api_data[j]['name'])
                                if(!student_list.includes(student_list_api_data[j]['id'])){
                                    student_list.push(student_list_api_data[j]['id'])
                                    con.query('INSERT INTO sys.student (student_id, student_name) VALUES (?,?)', [student_list_api_data[j]['id'], student_list_api_data[j]['name']])
                                }
                                if(!enroll_list.includes(student_list_api_data[j]['name']+course_api_data[i]['id'])){
                                    con.query('INSERT INTO sys.enrollment (student_name, course_id) VALUES (?,?)', [student_list_api_data[j]['name'], course_api_data[i]['id']])
                                    enroll_list.push(student_list_api_data[j]['name']+course_api_data[i]['id'])
                                }
                            }
                        }
                    }
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

app.get("/accessTokenHelp", (req, res) => {
    res.render("accessTokenHelp.ejs")
})

//test function bc I'm banned from using the API
app.get("/studentListTest", (req, res) => {
    let email = 'bsp5205@psu.edu'
    let access_token = '1050~GBIN59x1sBKpFavezbGrynevovREB5ocpAoKOUYApYuilYA1oxk7ris3Q8KID5GK'
    // let courses_url = 'https://canvas.instructure.com/api/v1/courses?access_token={}&per_page=100&include[]=term'.replace('{}', access_token)
    // const course_api_data = sync_fetch(courses_url, {}).json()
    // console.log(course_api_data.length)
    //console.log(course_api_data)
    let student_list=[]
    let enroll_list=[]
    let id = '10500000002207464'
    let student_list_url = 'https://canvas.instructure.com/api/v1/courses/{}/students/?access_token={}&per_page=100'.replace('{}', id).replace('{}', access_token)
    const student_list_api_data = sync_fetch(student_list_url, {}).json()
    console.log(student_list_api_data)
    for(let j = 0; j < student_list_api_data.length; j++){
        if(!enroll_list.includes(student_list_api_data[j]['name']+id)){
            enroll_list.push(student_list_api_data[j]['name']+id)
            con.query('INSERT INTO sys.enrollment (student_name, course_id) VALUES (?,?)', [student_list_api_data[j]['name'], id])
        }
    }
})

app.get("/help", (req, res) => {
    res.render("help.ejs")
})
