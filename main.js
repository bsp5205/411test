const express = require('express')
const path = require("path");

const app = express();
const port = 3000;

var bodyParser = require('body-parser')
app.use(bodyParser.urlencoded({extended: false}));

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
    parsedEmail = req.body.emailTest;
    console.log(parsedEmail)

    if(parsedEmail === 'bsp5205@psu.edu'){  //if DB updated successfully, render the page with the checkbox letter
        res.render("index", {title:siteTitle, message:tempMessage,envelope:"success",responseMessage:"Your attendance has been recorded!"});
    }else{  //if DB not updated, render the page with the !letter and a message saying the attendance update failed
        res.render("index", {title:siteTitle, message:tempMessage,envelope:"failure",responseMessage:"You put in an invalid email dumbass..."});
    }

});

