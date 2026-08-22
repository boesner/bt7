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
  res.render('news', { turnstileSiteKey: TURNSTILE_SITE_KEY });
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

/* ---------- Spam-Schutz Helfer (Honeypot / Turnstile / Rate-Limit) ---------- */

const TURNSTILE_SITE_KEY = process.env.TURNSTILE_SITE_KEY || "";
const TURNSTILE_SECRET_KEY = process.env.TURNSTILE_SECRET_KEY || "";

/*Render laeuft hinter einem Proxy - echte Client-IP steht in x-forwarded-for.*/
function getClientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) {
    return String(forwarded).split(",")[0].trim();
  }
  return req.ip || (req.connection && req.connection.remoteAddress) || "unknown";
}

/*Leichtgewichtiges In-Memory-Rate-Limit: max. 5 Versuche pro IP in 10 Minuten.
Keine Datenbank, kein externer Dienst.*/
const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const rateLimitHits = new Map();

function allowRequest(ip) {
  const now = Date.now();
  for (const [key, hits] of rateLimitHits) {
    const fresh = hits.filter(function(t){ return now - t < RATE_LIMIT_WINDOW_MS; });
    if (fresh.length === 0) {
      rateLimitHits.delete(key);
    } else {
      rateLimitHits.set(key, fresh);
    }
  }
  const current = rateLimitHits.get(ip) || [];
  if (current.length >= RATE_LIMIT_MAX) {
    return false;
  }
  current.push(now);
  rateLimitHits.set(ip, current);
  return true;
}

/*Turnstile-Token serverseitig bei Cloudflare verifizieren.*/
function verifyTurnstile(token, ip, callback) {
  if (!TURNSTILE_SECRET_KEY) {
    /*Nicht konfiguriert (z.B. lokal) - Formular bleibt nutzbar.*/
    console.warn("TURNSTILE_SECRET_KEY is not set - skipping Turnstile verification");
    return callback(true);
  }
  if (!token) {
    return callback(false);
  }

  const payload = new URLSearchParams({
    secret: TURNSTILE_SECRET_KEY,
    response: token,
    remoteip: ip
  }).toString();

  const verifyRequest = https.request("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "Content-Length": Buffer.byteLength(payload)
    }
  }, function(response){
    let body = "";
    response.on("data", function(chunk){ body += chunk; });
    response.on("end", function(){
      try {
        const result = JSON.parse(body);
        if (!result.success) {
          console.warn("Turnstile rejected token", result["error-codes"]);
        }
        callback(result.success === true);
      } catch (err) {
        console.error("Turnstile response could not be parsed", err, body);
        callback(false);
      }
    });
  });

  verifyRequest.on("error", function(err){
    console.error("Turnstile verification failed", err);
    callback(false);
  });

  verifyRequest.write(payload);
  verifyRequest.end();
}

/*posten der Inputinhalte zum Server, hinterlegen in Constants*/

app.post("/", function(req, res) {

  /*Spam-Schutz 1: Honeypot. Bots fuellen dieses unsichtbare Feld aus.
  In dem Fall tun wir so, als waere alles ok - ohne Mailchimp zu rufen.*/
  if (req.body.website) {
    console.warn("Newsletter signup blocked: honeypot filled");
    return res.render("ThankYouNewsletter");
  }

  /*Spam-Schutz 2: einfaches In-Memory-Rate-Limit pro IP.*/
  if (!allowRequest(getClientIp(req))) {
    console.warn("Newsletter signup blocked: rate limit");
    return res.status(429).sendFile(__dirname + "/failureBT.html");
  }

  /*Spam-Schutz 3: Cloudflare Turnstile serverseitig pruefen.
  Erst danach wird Mailchimp aufgerufen.*/
  verifyTurnstile(req.body["cf-turnstile-response"], getClientIp(req), function(ok) {
    if (!ok) {
      console.warn("Newsletter signup blocked: Turnstile verification failed");
      return res.status(400).sendFile(__dirname + "/failureBT.html");
    }
    subscribeToMailchimp();
  });

  function subscribeToMailchimp() {

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

/*API-Key, Server-Prefix und Audience-ID kommen aus den Environment-Variablen
(Render -> Environment). Niemals im Code hinterlegen - geleakte Keys werden
von Mailchimp automatisch deaktiviert.*/
const apiKey = process.env.MAILCHIMP_API_KEY;
const listId = process.env.MAILCHIMP_LIST_ID || "c5e61e58d1";
const serverPrefix = process.env.MAILCHIMP_SERVER_PREFIX ||
  (apiKey && apiKey.includes("-") ? apiKey.split("-").pop() : "us20");

if (!apiKey) {
  console.error("MAILCHIMP_API_KEY is not set");
  return res.status(500).sendFile(__dirname + "/failureBT.html");
}

const url = "https://" + serverPrefix + ".api.mailchimp.com/3.0/lists/" + listId;
const options = {
  method: "POST",
  auth: "anystring:" + apiKey,
  headers: {
    "Content-Type": "application/json",
    "Content-Length": Buffer.byteLength(jsonData)
  }
};

/*mit der node https Request methode schicken wir Daten an den Mailchimp Endpoint*/
const mcRequest = https.request(url, options, function(response){

  let body = "";
  response.on("data", function(chunk){
    body += chunk;
  });

  response.on("end", function(){
    if (response.statusCode >= 200 && response.statusCode < 300) {
      res.render("ThankYouNewsletter");
    } else {
      console.error("Mailchimp error", response.statusCode, body);
      res.status(502).sendFile(__dirname + "/failureBT.html");
    }
  });
});

mcRequest.on("error", function(err){
  console.error("Mailchimp request failed", err);
  res.status(502).sendFile(__dirname + "/failureBT.html");
});

mcRequest.write(jsonData);
mcRequest.end();
}
});


/*Failure-routes - completion handler that redirects user to home route */
app.post("/failure", function(req, res){
  res.redirect("/");
});


app.get('/', function(req, res) {
   res.render('index', { });
});

/*process.env.PORT - hier vergibt Heroku einen dynamischen Port -
ich kann aber über || 3000 trotzdem noch lokal testen*/
app.listen(process.env.PORT || 3000, function(){
  console.log("Server lauscht auf Port 3000!");
});
