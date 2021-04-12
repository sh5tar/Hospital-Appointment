var createError = require('http-errors');
var express = require('express');
var path = require('path');
var mysql=require("mysql");
var cookieParser = require('cookie-parser');
var scrypt = require("scrypt-async");
var logger = require('morgan');
var sessions=require("client-sessions");
var bodyParser=require("body-parser");

var app = express();
var connection = mysql.createConnection({
  host     : 'remotemysql.com',
  user     : 'PFMxEKMB8O',
  password : 'bpkGFTVvRQ',
  database : 'PFMxEKMB8O'
});
app.use(sessions({
  cookieName: 'User',
  secret: 'AHMADISHERE' ,
  duration:  60 * 60 * 1000,
}));
// test

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');
function toM(p1,p2){
  var te1 = p1.split(':'); // split it at the colons
  var m1 = (+te1[0]) * 60 + (+te1[1]);
// Hours are worth 60 minutes.
  var te2 = p2.split(':'); // split it at the colons
  var m2 = (+te2[0]) * 60 + (+te2[1]);
  return (te2-te1)
}
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.get('/', ((req, res) => {
    res.render("index", { userID: req.User.userID, type: req.User.type});
}));
app.get('/AddDoctor', ((req, res) => {
  res.render("AddDoctor", { userID: req.User.userID, type: req.User.type});
}));
app.get('/AddManager', ((req, res) => {
  res.render("AddManager", { userID: req.User.userID, type: req.User.type});
}));
app.get('/DoctorsPage', ((req, res) => {
  res.render("DoctorsPage", { userID: req.User.userID, type: req.User.type});
}));
app.get('/DoctorsPage', ((req, res) => {
  res.render("DoctorsPage", { userID: req.User.userID, type: req.User.type});
}));
app.get('/AddHospital', ((req, res) => {
  res.render("AddHospital", { userID: req.User.userID, type: req.User.type});
}));
app.get('/DoctorPerformence', ((req, res) => {
  res.render("DoctorPerformence", { userID: req.User.userID, type: req.User.type});
}));
app.get('/HospitalPerformence', ((req, res) => {
  res.render("HospitalPerformence", { userID: req.User.userID, type: req.User.type});
}));
app.get('/HospitalsPage', ((req, res) => {
  res.render("HospitalsPage", { userID: req.User.userID, type: req.User.type});
}));
app.get('/ManagersPage', ((req, res) => {
  res.render("ManagersPage", { userID: req.User.userID, type: req.User.type});
}));
app.get('/login', ((req, res) => {
  if(req.User.userID){
    res.render("login",{userID:req.User.userID,type:req.User.type});
  }else{
    res.render("login",{userID:0,type:null});
  }

}));
app.get('/register', ((req, res) => {
  if(req.User.userID){
    res.render("index",{userID:req.User.userID,type:req.User.type});
  }else{
    res.render("register",{userID:0,type:null});
  }

}));
app.get("/sign-out",function(request,response){
  request.User.userID="";
  request.User.type="";
  response.redirect("/");
});
app.get("/blank",function(request,response){
  request.User.userID="";
  request.User.type="";
  response.render("blank")
});
app.get("/profile",function(req,res){
  console.log(req.User)
  if(req.User.userID){
    connection.query("select Fname,Lname,GovID,Username,Gender,DoB,ContactNo,Address,Email,City from Users Where UID=?",[req.User.userID] , function (error, results, fields) {
      console.log(results[0].DoB)
      dd=new Date(results[0].DoB)
      console.log(dd)
      date1=dd.getFullYear()+"/"+dd.getMonth()+"/"+dd.getDate()
      res.render("profile",{i:results[0],DoB:date1,userID:req.User.userID,type:req.User.type})
    })}
  else{
    res.redirect("/")
  }
});
app.get('/usersPage/:id', ((req, res) => {
  if(req.User.type=="Manager"||req.User.type=="Admin"){
    connection.query('SELECT * from Users where ID=?',[req.params.id], function (error, results, fields) {
      if (error)
        throw error;
      res.render("profile", {profile: results, id: req.params.id, userID: req.User.userID, type: req.User.type});
    })}
  else{
        res.redirect("/")
  }
}));
app.post("/login",function(req,res){
  var result;
  console.log(req.body)
  scrypt(req.body.Password,"AhmedAndMustafa",{N:4096,r:8,p:1,dkLen:150,encoding: 'hex'}, function(derivedKey) {
    result=derivedKey;
  });
  console.log(result)
  connection.query("select UID,UserType from Users where UserName=? and Password=?",[req.body.User , result], function (error, results, fields) {
    if (error) throw error;
    if(results[0])
    {
      req.User.userID=results[0].UID;
      req.User.type="Patient";
      if(results[0].UserType=="Doctor"){
        connection.query("select SID from Doctors where UID=? ",[results[0].UID], function (erro, result, field) {
              if (error) throw error;
              if(result[0].StatusID==5){
                req.User.type=results[0].UserType;
                console.log("he made it here")
                res.redirect("/");
              }
              else res.redirect("/");
            }
        )}
      else if(results[0].UserType=="Manager"||results[0].UserType=="Admin"){
        connection.query("select SID from Managers where UID=? ",[results[0].UID], function (erro, result, field) {
              if (error) throw error;
              if(result[0].SID==5){
                req.User.type=results[0].UserType;
                console.log("he made it here")
                res.redirect("/");
              }
              else res.redirect("/");
            }
        )
      }
      else{
        console.log(req.User)
        res.redirect("/");}
    }
    else
      res.render("login", {error:"username or password is wrong"});
  });

});
app.post("/register",function(req,res){
  var result;
  scrypt(req.body.Password,"AhmedAndMustafa",{N:4096,r:8,p:1,dkLen:150,encoding: 'hex'}, function(derivedKey) {
    result=derivedKey;
    console.log(result)
  });
  console.log(req.body.Gender)

  connection.query('insert into Users () values(null,?,?,?,"Patient",?,?,?,?,?,?,?,CURRENT_TIMESTAMP,?)',[req.body.Fname,req.body.Lname,req.body.GovID,req.body.Uname,result,req.body.Gender,req.body.DoB,req.body.ContactN,req.body.Building+", "+req.body.Street+", "+req.body.City,req.body.Email, req.body.City], function (error, results, fields) {
    if (error) throw error;
  });

  res.redirect("/");
});
app.post("/deleteDoctor", function (req,res){
  if(req.User.type=="Manager"||req.User.type=="admin"){
    connection.query('UPDATE  Doctors SET SID=number WHERE DID=?',[req.body.DID], function (error, results, fields) {
      if (error) throw error;
    });
  }
});
app.post("/addDoctor",function (req,res){
  var result;
  scrypt(req.body.password,"AhmedAndMustafa",{N:4096,r:8,p:1,dkLen:150,encoding: 'hex'}, function(derivedKey) {
    result=derivedKey;
  });
  connection.query('insert into Users () values(null,?,?,?,?,?,?,?,?,?,?,?,CURRENT_TIMESTAMP)',[req.body.Fname,req.body.Lname,req.body.GovID,req.body.Gender,req.body.Type,req.body.userName,result,req.body.Dob,req.body.phoneNumber,req.body.Address,req.body.Email], function (error, results, fields) {
    if (error) throw error;
    connection.query('insert into Doctors () values(null,?,?,?,?,5)',[results.insertId,req.body.HID,req.body.Dname,req.body.Specialty, req.body.Experience], function (erro, result, field) {
      if (erro) throw erro;
    });
  });
});
app.post("/Appointments-Schedule",function (req, res) {
  list=[]
  doctor=[]
  if(req.User.userID){
    connection.query('Select D.DID, D.DName, D.Specialty,A.Date,A.STime,A.ETime, AP.ADate,AP.ATime,AP.Length,AP.Status from Doctors as D INNER JOIN DoctorAvailability as A on D.DID =A.DID  Where D.SPID=? and A.Date=?',[req.body.SP, req.body.Adate], function (error, results, fields) {
      if (error) throw error;

        for (i=0; i <results.lenth; i++){
          len= toM(results[i].Etime,resutls[i].Stime)
          part=len/20
          DID=results[i].DID
          for (x =0;x<part;x++){
            time=new Date(results[i].Stime)
            S=time.getHours()+":"+time.getMinutes()
            connection.query('Select D.DID, D.DName, AP.ADate,AP.ATime,AP.Length,AP.Status from Doctors as D INNER JOIN Appointments as A on D.DID =A.DID  Where D.SPID=? and A.ADate=? and D.DID=?',[req.body.SP, req.body.Adate,DID], function (error, results2, fields) {
              if (error) throw error;
              slot=[S,0,resutls.DID]
          });
            doctor.push(slot)

          }
          list.push(doctor)
          doctor=[]
        }
        res.render("?", {listD : list,userID:req.User.userID,type:req.User.type})

    });
  }else{
    res.redirect("/")
  }
});
app.post("/UserEdit", function (req,res){
  if(req.User.userID){
    console.log(req.body)
    connection.query("UPDATE  Users SET Fname=? , Lname=? , GovID=?, Username=? , Gender=? , DoB=? , Email=? , ContactNo=? Where UID=?",[req.body.Fname,req.body.Lname,req.body.GovID,req.body.Username,req.body.Gender,req.body.DoB,req.body.Email,req.body.ContactNo,req.User.userID] , function (error, results, fields) {
      console.log("yo")
      res.redirect("/profile")
    });}
});
app.post("/ContactEdit", function (req,res){
  if(req.User.userID){
    console.log(req.User)

    connection.query("UPDATE  Users SET Address=? , City=? Where UID=?",[req.body.Address,req.body.City,req.User.userID] , function (error, results, fields) {
      console.log("cahnge")
      res.redirect("/profile")
    });}
});

const PORT =process.env.PORT ||5000;
app.listen(PORT, ()=> console.log('server started in port:  '+PORT));
module.exports = app;
/*

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});
// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
*/