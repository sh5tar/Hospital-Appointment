var createError = require('http-errors');
var express = require('express');
var path = require('path');
var mysql=require("mysql");
var cookieParser = require('cookie-parser');
var scrypt = require("scrypt-async");
var multer  = require('multer')
var upload = multer()
var logger = require('morgan');
var sessions=require("client-sessions");
var bodyParser=require("body-parser");

var db_config = {
  host: 'remotemysql.com',
  user: 'PFMxEKMB8O',
  password: 'bpkGFTVvRQ',
  database: 'PFMxEKMB8O'
};

var connection;

function handleDisconnect() {
  connection = mysql.createConnection(db_config); // Recreate the connection, since
                                                  // the old one cannot be reused.

  connection.connect(function(err) {              // The server is either down
    if(err) {                                     // or restarting (takes a while sometimes).
      console.log('error when connecting to db:', err);
      setTimeout(handleDisconnect, 2000); // We introduce a delay before attempting to reconnect,
    }                                     // to avoid a hot loop, and to allow our node script to
  });                                     // process asynchronous requests in the meantime.
                                          // If you're also serving http, display a 503 error.
  connection.on('error', function(err) {
    console.log('db error', err);
    if(err.code === 'PROTOCOL_CONNECTION_LOST') { // Connection to the MySQL server is usually
      handleDisconnect();                         // lost due to either server restart, or a
    } else {                                      // connnection idle timeout (the wait_timeout
      throw err;                                  // server variable configures this)
    }
  });
}

handleDisconnect();
var app = express();

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
app.get('/', (function (req, res)  {
    res.render("index", { userID: req.User.userID, type: req.User.type});
}));
app.get('/AddDoctor', function (req, res)  {
  if (req.User.type=="Admin"||req.User.type=="Manager"){
    connection.query("select CID,Cname from Cities" , function (error, results, fields) {
      if (error) throw error;
      connection.query("select * from Specialty",function (error1,results1,fields1) {
        if (error1) throw error1;
        res.render("AddDoctor", { Sp:results1,Cities:results,userID: req.User.userID, type: req.User.type});
      })

    })}else{
    res.redirect("/")
  }
});
app.get('/AddManager', (function (req, res)  {
  if (req.User.type=="Admin"||req.User.type=="Manager"){
    connection.query("select CID,Cname from Cities" , function (error, results, fields) {
      if (error) throw error;
      res.render("AddManager", { Cities:results,userID: req.User.userID, type: req.User.type});
    })}else{
    res.redirect("/")
  }
}));
app.get('/AddHospital', (function (req, res)  {
  if (req.User.type=="Admin"||req.User.type=="Manager"){
    connection.query("select CID,Cname from Cities" , function (error, results, fields) {
      if (error) throw error;
      res.render("AddHospital", { Cities:results,userID: req.User.userID, type: req.User.type});
    })}else{
    res.redirect("/")
  }
}));
app.get('/DoctorsPage', (function (req, res)  {
  if (req.User.type=="Admin"||req.User.type=="Manager"){
    connection.query("SELECT Doctors.UID, Users.Fname,Users.Lname,Specialty.Specialty,Doctors.Experience,Users.DateOfCreation  from Doctors Inner JOIN Users on Users.UID=Doctors.UID Inner JOIN Specialty on Specialty.SPID=Doctors.SPID",[req.User.userID] , function (error, results, fields) {
      if (error) throw error;
      res.render("DoctorsPage", { i:results,userID: req.User.userID, type: req.User.type});

    });
  }else{
    res.redirect("/")
  }
}));
app.get('/DoctorAvailability', (function (req, res)  {
  if (req.User.type=="Admin"||req.User.type=="Manager"){
    connection.query("SELECT Doctors.UID, Users.Fname,Users.Lname,Specialty.Specialty,Doctors.Experience,Users.DateOfCreation  from Doctors Inner JOIN Users on Users.UID=Doctors.UID Inner JOIN Specialty on Specialty.SPID=Doctors.SPID",[req.User.userID] , function (error, results, fields) {
      if (error) throw error;
      res.render("DoctorAvailability", { i:results,userID: req.User.userID, type: req.User.type});

    });
  }else{
    res.redirect("/")
  }
}));
app.get('/HospitalsPage', (function (req, res)  {
  if (req.User.type=="Admin"||req.User.type=="Manager"){
    connection.query("SELECT HID,HName,Cname,Location from Hospitals Inner JOIN Cities on Hospitals.CID = Cities.CID" , function (error, results, fields) {
      res.render("HospitalsPage", { i:results,userID: req.User.userID, type: req.User.type});

    });
  }else{
    res.redirect("/")
  }
}));
app.get('/ManagersPage', (function (req, res)  {
  if (req.User.type=="Admin"||req.User.type=="Manager"){
    connection.query("SELECT Managers.UID, Users.Fname,Users.Lname,Hospitals.HName,Users.DateOfCreation from Managers Inner JOIN Users on Managers.UID=Users.UID Inner JOIN Hospitals on Managers.HID= Hospitals.HID" , function (error, results, fields) {
      res.render("ManagersPage", { i:results,userID: req.User.userID, type: req.User.type});

    });
  }else{
    res.redirect("/")
  }
}));
app.get('/AddShift', (function (req, res)  {
  if (req.User.type=="Admin"||req.User.type=="Manager"){
    connection.query("select CID,Cname from Cities" , function (error, results, fields) {
      if (error) throw error;
      res.render("AddShift", { Cities:results,userID: req.User.userID, type: req.User.type});
    })}else{
    res.redirect("/")
  }
}));
app.get('/ScheduleAppointment', (function (req, res)  {
  if (req.User.type=="Admin"||req.User.type=="Manager"){
    connection.query("select SPID, Specialty from Specialty" , function (error, results, fields) {
      if (error) throw error;
      res.render("ScheduleAppointment", { SP:results,userID: req.User.userID, type: req.User.type});
    })}else{
    res.redirect("/")
  }
}));
app.get('/DoctorPerformence', function (req, res) {
  if (req.User.type=="Admin"||req.User.type=="Manager"){
    connection.query("select Fname,Lname,GovID,Username,Gender,DoB,ContactNo,Address,Email,Cname as City from Users Inner join Cities on Cities.CID=Users.City Where UID=?",[req.User.userID] , function (error, results, fields) {
      console.log(results[0].DoB)
      dd=new Date(results[0].DoB)
      console.log(dd)
      date1=dd.getFullYear()+"/"+dd.getMonth()+"/"+dd.getDate()
      res.render("DoctorPerformence", { userID: req.User.userID, type: req.User.type});
    })}

  else{
    res.redirect("/")
  }
});
app.get('/HospitalPerformence', function (req, res)  {
  if (req.User.type=="Admin"||req.User.type=="Manager"){
    res.render("HospitalPerformence", { userID: req.User.userID, type: req.User.type});
  }else{
    res.redirect("/")
  }
});
app.get('/login', function (req, res)  {
  if(req.User.userID){
    res.redirect("/");
  }else{

    res.render("login",{userID:req.User.userID,type:req.User.type});
  }

});
app.get('/register', function (req, res) {
  if(req.User.userID){
    res.redirect("/");
  }else{
    res.render("register",{userID:0,type:null});
  }

});
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
    connection.query("select Fname,Lname,GovID,Username,Gender,DoB,ContactNo,Address,Email,Cname as City from Users Inner join Cities on Cities.CID=Users.City Where UID=?",[req.User.userID] , function (error, results, fields) {
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
app.get('/usersPage/:id', function (req, res)  {
  if(req.User.type=="Admin"||req.User.type=="Manager"){
    connection.query("select Fname,Lname,GovID,Username,Gender,DoB,ContactNo,Address,Email,Cname as City from Users Inner join Cities on Cities.CID=Users.City Where UID=?",[req.params.id] , function (error, results, fields) {
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
    connection.query('UPDATE  Doctors SET SID=4 WHERE DID=?',[req.body.DID], function (error, results, fields) {
      if (error) throw error;
    });
  }
});
app.post("/AddDoctor",upload.array('img',6),function (req,res){
  if (req.User.type=="Admin"||req.User.type=="Manager"){
  var result;
  scrypt(req.body.password,"AhmedAndMustafa",{N:4096,r:8,p:1,dkLen:150,encoding: 'hex'}, function(derivedKey) {
    result=derivedKey;
  });
  connection.query('insert into Users () values(null,?,?,?,?,"Doctor",?,?,?,?,?,?,CURRENT_TIMESTAMP)',[req.body.Fname,req.body.Lname,req.body.GovID,req.body.Gender,req.body.Type,req.body.Username,result,req.body.Dob,req.body.ContactNo,req.body.Address,req.body.Email], function (error, results, fields) {
    if (error) throw error;
    connection.query('insert into Doctors () values(null,?,?,?,?,?,5)',[results.insertId,req.body.HID,req.body.Dname,req.body.Specialty, req.body.Experience,req.filename[0].buffer], function (erro, result, field) {
      if (erro) throw erro;
    res.redirect("/DoctorsPage")
    });
  });
}
});

app.post("/AddManager",function (req,res){
  if (req.User.type=="Admin"||req.User.type=="Manager"){
    var result;
    scrypt(req.body.password,"AhmedAndMustafa",{N:4096,r:8,p:1,dkLen:150,encoding: 'hex'}, function(derivedKey) {
      result=derivedKey;
    });
    connection.query('insert into Users () values(null,?,?,?,?,"Manager",?,?,?,?,?,?,CURRENT_TIMESTAMP)',[req.body.Fname,req.body.Lname,req.body.GovID,req.body.Gender,req.body.userName,result,req.body.Dob,req.body.phoneNumber,req.body.Address,req.body.Email], function (error, results, fields) {
      if (error) throw error;
      connection.query('insert into Managers () values(null,?,5,?)',[results.insertId,req.body.HID], function (erro, result, field) {
        if (erro) throw erro;
      });
    });
  }
});
app.post("/AddHospital",function (req,res){
  if (req.User.type=="Admin"||req.User.type=="Manager"){
    connection.query('insert into Hospitals () values(null,?,?,?)',[req.body.HName,req.body.Location,req.body.CID], function (error, results, fields) {
      if (error) throw error;
    })
  }

})
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