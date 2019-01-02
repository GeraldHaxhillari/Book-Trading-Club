// server.js
// where your node app starts

// init project
var express = require('express');
var mongodb = require('mongodb');
var ejs = require('ejs');
var passport = require('passport');
var Strategy = require('passport-twitter').Strategy;
var session = require('express-session');
var bodyparser = require('body-parser');
var requestHTTP = require('request');
var app = express();
var uri = 'mongodb://'+process.env.USER+':'+process.env.PASS+'@'+process.env.HOST+':'+process.env.PORT+'/'+process.env.DB;

//Passport Auth Stuff
passport.use(new Strategy({
  consumerKey: process.env.CONSUMER_KEY,
  consumerSecret: process.env.CONSUMER_SECRET,
  callbackURL: 'https://book-trade-club.me/login/twitter/return'
},
function(token, tokenSecret, profile, cb) {
  return cb(null, profile);
}));

passport.serializeUser(function(user, cb) {
  cb(null, user);
});

passport.deserializeUser(function(obj, cb) {
  cb(null, obj);
});

app.use(session({
  secret: 'potato man',
  resave: false,
  saveUninitialized: true
}))

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(passport.initialize());
app.use(passport.session());
app.use(bodyparser.urlencoded({extended: false}));


// http://expressjs.com/en/starter/basic-routing.html
app.get("/", function (request, response) {
  //response.sendFile(__dirname + '/views/index.html');
  if(request.isAuthenticated()){
     mongodb.MongoClient.connect(uri, (err, dbase)=>{
      if(err) throw err;
      var dbx = dbase.db(process.env.DB);
      var coll = dbx.collection(process.env.COLLECTION1);
      var data = {"uid": request.user.id, "name": request.user.displayName, "city": null, "state": null};
      coll.findAndModify({ uid: request.user.id },{},{$setOnInsert: data},{new: true,upsert: true},(err, dbase)=>{
        if(err) throw err;  
      });
    });
  }
  mongodb.MongoClient.connect(uri, (err, dbase)=>{
      if(err) throw err;
      var dbx = dbase.db(process.env.DB);
      var coll = dbx.collection(process.env.COLLECTION);
      coll.find().toArray((err, doc)=>{
        if (err) throw err;
          if(request.isAuthenticated()){
            response.render('index', { auth: request.isAuthenticated(), db: doc, uid:request.user.id});
          }else{
            response.render('index', { auth: request.isAuthenticated(), db: doc});
          }
          
      });
    });
});

app.get("/request/book/:ISBN/:ID", function (request, response) {
if(request.isAuthenticated()){
    mongodb.MongoClient.connect(uri, (err, dbase)=>{
      if(err) throw err;
      var dbx = dbase.db(process.env.DB);
      var coll = dbx.collection(process.env.COLLECTION);
      var qr = {"isbn": request.params.ISBN,"uid": request.params.ID};
      coll.find(qr).toArray((err, doc)=>{
        if (err) throw err;
        var up_data = null;
        console.log(doc);
        if(doc[0].user_request == 0){
          up_data = {"user_request": request.user.id+','};
        }else{
           up_data = {"user_request": doc[0].user_request+request.user.id+','};
        }
        coll.updateOne(qr,{ $set:up_data},(err, doc1)=>{
        if (err) throw err;
        response.redirect('/');    
        });
      });
    });
  }else{
    response.send({"Error": "Not Authenticated."});
  }
})

app.get("/profile/show/:ID", function (request, response) {
  if(request.isAuthenticated()){
    mongodb.MongoClient.connect(uri, (err, dbase)=>{
      if(err) throw err;
      var dbx = dbase.db(process.env.DB);
      var coll = dbx.collection(process.env.COLLECTION1);
      coll.find({"uid": request.params.ID}).toArray((err, doc)=>{
        if (err) throw err;
          response.render('show', { auth: request.isAuthenticated(), profile: doc});
      });
    });
  }else{
    response.send({"Error": "Not Authenticated."});
  }
});

app.get("/remove/book/:ISBN", function (request, response) {
  mongodb.MongoClient.connect(uri, (err, dbase)=>{
      if(err) throw err;
      var dbx = dbase.db(process.env.DB);
      var coll = dbx.collection(process.env.COLLECTION);
      coll.remove({"uid":request.user.id, "isbn":request.params.ISBN},(err, doc)=>{
        if (err) throw err;
        response.redirect('/dashboard');
      });
    });
});

app.get("/accept/book/:ISBN/:ID", function (request, response) {
  mongodb.MongoClient.connect(uri, (err, dbase)=>{
    if(err) throw err;
    var dbx = dbase.db(process.env.DB);
    var coll = dbx.collection(process.env.COLLECTION);
    coll.updateOne({"uid":request.user.id,"isbn":request.params.ISBN},{ $set:{"accept":request.params.ID}},(err, doc1)=>{
      if (err) throw err;
      response.redirect('/dashboard');    
    });
  });
});

app.get("/profile/edit", function (request, response) {
  if(request.isAuthenticated()){
    mongodb.MongoClient.connect(uri, (err, dbase)=>{
      if(err) throw err;
      var dbx = dbase.db(process.env.DB);
      var coll = dbx.collection(process.env.COLLECTION1);
      coll.find({"uid": request.user.id}).toArray((err, doc)=>{
        if (err) throw err;
          console.log(doc);
          response.render('edit', { auth: request.isAuthenticated(), profile: doc});
      });
    });
  }else{
    response.send({"Error": "Not Authenticated."});
  }
});

app.get("/dashboard", function (request, response) {
  if(request.isAuthenticated()){
    mongodb.MongoClient.connect(uri, (err, dbase)=>{
      if(err) throw err;
      var dbx = dbase.db(process.env.DB);
      var coll = dbx.collection(process.env.COLLECTION);
      coll.find({"uid": request.user.id}).toArray((err, doc1)=>{
        if (err) throw err;
        coll.find().toArray((err, doc2)=>{
        if (err) throw err;
           response.render('dashboard', { auth: request.isAuthenticated(), userBooks: doc1, userBooks2: doc2, userBooks3: doc1, user: request.user.id});
        });
      });
    });
  }else{
    response.send({"Error": "Not Authenticated."});
  }
});

app.post("/profile/edit", function (request, response) {
  mongodb.MongoClient.connect(uri, (err, dbase)=>{
    if(err) throw err;
    var dbx = dbase.db(process.env.DB);
    var coll = dbx.collection(process.env.COLLECTION1);
    coll.findOneAndUpdate({uid: request.user.id}, {$set:{"name":request.body.nameInput, "city": request.body.cityInput, "state": request.body.stateInput}}, {upsert: true,new: true},(err, doc1)=>{
      if (err) throw err;
      response.redirect('/profile/edit');    
    });
  });
});

app.post("/", function (request, response){ 
  var url = 'https://openlibrary.org/api/books?bibkeys=ISBN:'+request.body.addBook+'&jscmd=details&format=json';
  requestHTTP(url, function (error, res, body) {
    console.log('error:', error); // Print the error if one occurred
    console.log('statusCode:', res && res.statusCode); // Print the response status code if a response was received
    console.log('body:', body); // Print the HTML for the Google homepage.
    if(!error){
    if(body != '{}'){
      var JSON_data = JSON.parse(body);
      var title = JSON_data["ISBN:"+request.body.addBook]["details"].title;
      console.log(title);
      var thumb;
      if(JSON_data["ISBN:"+request.body.addBook].thumbnail_url != undefined){
        thumb = JSON_data["ISBN:"+request.body.addBook].thumbnail_url.replace('S', 'M');
      }else{
        thumb = 'https://cdn.glitch.com/c903ae76-9abc-461e-9def-f60981cc9412%2Fno-cover.png?1519750744904';
      }
      console.log(thumb);
      var book_data = {"isbn": request.body.addBook, "title": title, "thumb": thumb, "uid": request.user.id, "accept": 0, user_request: 0} 
      mongodb.MongoClient.connect(uri, (err, dbase)=>{
        if(err) throw err;
        var dbx = dbase.db(process.env.DB);
        var coll = dbx.collection(process.env.COLLECTION);
        coll.insert(book_data,(err,res)=>{
          if(err) throw err;
          response.redirect('/');
        });
      });
    }else{
      response.send({"Error": "Unable to find book."});
    }
    }
  });
});


app.get('/login/twitter', passport.authenticate('twitter'));

app.get('/login/twitter/return', passport.authenticate('twitter', { failureRedirect: '/' }), function(req, res) {
  console.log(req.user.id);
  res.redirect('/');
});

app.get("/logout/twitter", function (request, response) {
  request.logout();
  response.redirect('/');
});

// listen for requests :)
var listener = app.listen(3000, function () {
  console.log('Your app is listening on port ' + listener.address().port);
});
