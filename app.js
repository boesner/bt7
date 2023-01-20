// jshint esversion:6

const express = require("express");
const request = require("request");
const https = require("https");
const bodyParser= require ("body-parser");

const app = express();

/*Diese Methode muss verwendet werden, da wir statische dateien aus unserem
lokalen File-system verwenden. Damit der Server statische Dateien serven kann, v
verwenden wir diese Methode. CSS und Images werden im public ordner gespeichert  */
app.use(express.static("public"));

/*Diese Zeile wird fürs Routing verwendet*/
app.set('view engine', 'ejs');


/*Um bodyParsers zu benutzen, muss diese Zeile benutzt werdedn*/
app.use(bodyParser.urlencoded({extended:true}));

/*app.get("/", function(req, res){
  res.sendFile(__dirname + "/news.html");
});*/

app.get("/", function(req, res){
  res.render("index");
});

app.get('/news', function(req, res) {
  res.render('news');
});

app.get('/news2', function(req, res) {
  res.render('news2');
});

app.get('/test', function(req, res) {
  res.render('test');
});

app.get('/contact', function(req, res) {
  res.render('contact');
});

app.get('/band', function(req, res) {
  res.render('band');
});

app.get('/live', function(req, res) {
  res.render('live');
});

app.get('/band', function(req, res) {
  res.render('band');
});

app.get('/disclaimer', function(req, res) {
  res.render('disclaimer');
});

app.get('/ThankYou', function(req, res) {
  res.render('ThankYou');
});

app.get('/ThankYouNewsletter', function(req, res) {
  res.render('ThankYouNewsletter');
});

/*posten der Inputinhalte zum Server, hinterlegen in Constants*/
app.post("/", function(req, res) {
  const firstName = req.body.fName;
  const lastName = req.body.lName;
  const email = req.body.email;

/*Mailchimp erwartet ein flaches JSON. Hier legen wir zuerst das entsprechende
JS-Objekt an und wandeln später um. Die Spezifikationen finden sich in der
Mailchimp API-Dokumentation. */

var data = {
  members: [
    {
      email_address: email,
      status: "subscribed",
      merge_fields: {
        FNAME: firstName,
        LNAME: lastName
      }
    }
  ]
};

/*Das Javascript-Objekt muss als flatpack-JSON an Mailchimp-API übergeben werden.
Das passiert hier (Umwandlung in String im JSON-Format)*/
const jsonData = JSON.stringify(data);

const url = "https://us20.api.mailchimp.com/3.0/lists/c5e61e58d1";
const options = {
  method: "POST",
  auth: "boesner:9ee3fee7066a913623270abb6e1d6799-us20"
};

/*mit der node https Request methode schicken wir DAten an den Mailchimp Endpoin*/
const request = https.request(url, options, function(response){

  if (response.statusCode === 200) {
    res.render("ThankYouNewsletter");
  } else {
    res.sendFile(__dirname + "/failureBT.html");
  }

  response.on("data", function(data){
    console.log(JSON.parse(data));
  });
});
request.write(jsonData);
request.end();
});

/*Failure-routes - completion handler that redirects user to home route */
app.post("/failure", function(req, res){
  res.redirect("/");
});

/*Mailchimp API KEY*/
/*90ca21ccaac6e838beadbdd46dc2bfda-us20*/


/*Mailchimp List ID, also referred to as Audience ID*/
/*c5e61e58d1*/

app.get('/', function(req, res) {
   res.render('index', { });
});

/*process.env.PORT - hier vergibt Heroku einen dynamischen Port -
ich kann aber über || 3000 trotzdem noch lokal testen*/
app.listen(process.env.PORT || 3000, function(){
  console.log("Server lauscht auf Port 3000!");
});
