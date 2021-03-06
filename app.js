var createError = require('http-errors');
var express = require('express');
var path = require('path');
var mysql = require("mysql");
var cookieParser = require('cookie-parser');
var scrypt = require("scrypt-async");
var logger = require('morgan');
var sessions = require("client-sessions");
var bodyParser = require("body-parser");
var ejs= require("ejs")

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

    connection.connect(function (err) {              // The server is either down
        if (err) {                                     // or restarting (takes a while sometimes).
            console.log('error when connecting to db:', err);
            setTimeout(handleDisconnect, 2000); // We introduce a delay before attempting to reconnect,
        }                                     // to avoid a hot loop, and to allow our node script to
    });                                     // process asynchronous requests in the meantime.
                                            // If you're also serving http, display a 503 error.
    connection.on('error', function (err) {
        console.log('db error', err);
        if (err.code === 'PROTOCOL_CONNECTION_LOST') { // Connection to the MySQL server is usually
            handleDisconnect();                         // lost due to either server restart, or a
        } else {                                      // connnection idle timeout (the wait_timeout
            throw err;                                  // server variable configures this)
        }
    });
}

handleDisconnect();
var app = express();
app.get('/getAppointment', function (req,res) {
    dl=(req.query.Adate+"").split("-")
    console.log(dl)
    dateA=new Date(req.query.Adate)

    console.log(dateA)
    dateA.setDate(dateA.getDate()-dateA.getDay())
    console.log(dateA.getDay())
    stri=dateA.getFullYear()+"-"+(dateA.getMonth()+1)+"-"+dateA.getDate()
    console.log(stri)
    list = []
    doctor = []
    ress = []

    connection.query('Select D.DID, D.DName, D.SPID,A.Date,A.STime,A.ETime, D.HID from Doctors as D INNER JOIN DoctorAvailability as A on D.DID =A.DID  where A.Date=? and D.HID=? and D.SPID=?', [stri,req.query.HID,req.query.SP], function (error, results, fields) {
        if (error) throw error;
        connection.query('Select D.DID, D.DName, D.SPID, AP.ADate,AP.ATime,AP.Length,AP.Status from Doctors as D Inner join Appointments as AP on AP.DID=D.DID where D.HID=? and D.SPID=? ',[req.query.HID,req.query.SP], function (error2, results2, fields) {
            if (error2) throw error2;
            ress = results2
            for (i = 0; i < results.length; i++) {
                DID = results[i].DID
                len = toM(results[i].ETime, results[i].STime)
                part = len / 20

                for (x = 0; x < part; x++) {
                    time = new Date(results[i].STime)
                    var te1 = results[i].STime.split(':');
                    var m1 = (+te1[0]) * 60 + (+te1[1]) + 20 * x;
                    if (m1 % 60 == 0) ST = Math.floor(m1 / 60) + ":00:00"
                    else ST = Math.floor(m1 / 60) + ":" + m1 % 60 + ":00"
                    slot = [ST, 0, DID]
                    for (s = 0; s < ress.length; s++) {
                        var te2 = ress[s].ATime.split(':');
                        test = (+te2[0]) * 60 + (+te2[1]);
                        if (test == m1 && DID == ress[s].DID) {
                            slot = [ST, 1]
                            break;
                        }
                    }

                    doctor.push(slot)

                }
                list.push([doctor, results[i]])
                doctor = []
            }
            res.send(list)
        });

    })

})

app.use(sessions({
    cookieName: 'User',
    secret: 'AHMADISHERE',
    duration: 60 * 60 * 1000,
}));
// test

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

function toM(p1, p2) {
    var te1 = p1.split(':'); // split it at the colons
    var m1 = (+te1[0]) * 60 + (+te1[1]);
// Hours are worth 60 minutes.
    var te2 = p2.split(':'); // split it at the colons
    var m2 = (+te2[0]) * 60 + (+te2[1]);
    return m1 - m2
}


app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({extended: false}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.get('/', (function (req, res) {
    if(req.User.type){
        connection.query("select * from Appointments where UID=? and Status=3 ",[req.User.userID],function (error,results,fields){
            if(error)throw error
            console.log(req.User)
            console.log("you made here")
            res.render("index", {i:results,userID: req.User.userID, type: req.User.type, HID: req.User.HID});
        })
    }
    else{
        console.log("this is going all on ")
    res.render("index", {userID: req.User.userID, type: req.User.type, HID: req.User.HID});}
}));
app.post('/data', function (req,res) {
    console.log(req.body)
    var some = ejs.compile(path.join(__dirname,'views'))
    var ht = some(req.body.list)
    tl= JSON.parse(req.body.list)
    console.log(tl)
    res.render('data',{listD:tl}
    )
})
app.get('/AddDoctor', function (req, res) {
    if (req.User.type == "Admin" || req.User.type == "Manager") {
        connection.query("select CID,Cname from Cities", function (error, results, fields) {
            if (error) throw error;
            connection.query("select * from Specialty", function (error1, results1, fields1) {
                if (error1) throw error1;
                connection.query("select * from Hospitals", function (error2, results2, fields1) {
                    if (error2) throw error2;
                    res.render("AddDoctor", {Sp: results1,HS:results2, Cities: results, userID: req.User.userID, type: req.User.type, HID: req.User.HID});
                })
            })

        })
    } else {
        res.redirect("/")
    }
});
app.get('/AddManager', (function (req, res) {
    if (req.User.type == "Admin" || req.User.type == "Manager") {
        connection.query("select CID,Cname from Cities", function (error, results, fields) {
            if (error) throw error;
            connection.query("select * from Hospitals", function (error, results1, fields) {
                if (error) throw error;
            res.render("AddManager", {HP:results1,Cities: results, userID: req.User.userID, type: req.User.type, HID: req.User.HID});
        })
        })
    } else {
        res.redirect("/")
    }
}));
app.get('/Appointment/:ID', (function (req, res) {
    if (req.User.type) {
        connection.query("SELECT D.DName, Users.Fname,Users.Lname,A.ADate,A.ATime,A.AID from Appointments as A inner join Doctors as D on A.DID=D.DID inner join Users on Users.UID =A.UID  where A.AID=?", [req.params.ID], function (error, results, fields) {
            if (error) throw error;
            res.render("Appointment", {Info: results, userID: req.User.userID, type: req.User.type, HID: req.User.HID});
        })
    } else {
        res.redirect("/")
    }
}));
app.get('/AddHospital', (function (req, res) {
    if (req.User.type == "Admin" || req.User.type == "Manager") {
        connection.query("select CID,Cname from Cities", function (error, results, fields) {
            if (error) throw error;
            res.render("AddHospital", {Cities: results, userID: req.User.userID, type: req.User.type, HID: req.User.HID});
        })
    } else {
        res.redirect("/")
    }
}));
app.get('/DoctorsPage', (function (req, res) {
    if(req.User.type == "Admin"){
        connection.query("SELECT Doctors.UID,Doctors.DID,Doctors.SID, Users.Fname,Users.Lname,Specialty.Specialty,Doctors.Experience,Users.DateOfCreation  from Doctors Inner JOIN Users on Users.UID=Doctors.UID Inner JOIN Specialty on Specialty.SPID=Doctors.SPID  ", function (error, results, fields) {
            if (error) throw error;
            res.render("DoctorsPage", {i: results, userID: req.User.userID, type: req.User.type, HID: req.User.HID});

        });
    } else if(req.User.type == "Manager"){
        connection.query("SELECT Doctors.UID,Doctors.DID,Doctors.SID, Users.Fname,Users.Lname,Specialty.Specialty,Doctors.Experience,Users.DateOfCreation  from Doctors Inner JOIN Users on Users.UID=Doctors.UID Inner JOIN Specialty on Specialty.SPID=Doctors.SPID where Doctors.HID=? ", [req.User.HID], function (error, results, fields) {
            if (error) throw error;
            res.render("DoctorsPage", {i: results, userID: req.User.userID, type: req.User.type, HID: req.User.HID});

        });
    }
    else {
        res.redirect("/")
    }
}));
app.get('/DoctorAvailability', (function (req, res) {
    if (req.User.type == "Admin") {
        connection.query("SELECT Doctors.UID, Users.Fname,Users.Lname,A.Date,A.STime,A.ETime, A.DAID  from Doctors Inner JOIN Users on Users.UID=Doctors.UID Inner JOIN DoctorAvailability as A on A.DID=Doctors.DID where A.Date>=  CURDATE() ", [req.User.userID], function (error, results, fields) {
            if (error) throw error;
            res.render("DoctorAvailability", {i: results, userID: req.User.userID, type: req.User.type, HID: req.User.HID});

        });
    }  else if (req.User.type == "Manager") {
        connection.query("SELECT Doctors.UID, Users.Fname,Users.Lname,A.Date,A.STime,A.ETime, A.DAID  from Doctors Inner JOIN Users on Users.UID=Doctors.UID Inner JOIN DoctorAvailability as A on A.DID=Doctors.DID where A.Date>=  CURDATE() and Doctors.HID=?", [req.User.HID], function (error, results, fields) {
            if (error) throw error;
            res.render("DoctorAvailability", {i: results, userID: req.User.userID, type: req.User.type, HID: req.User.HID});

        });
    } else {
        res.redirect("/")
    }
}));
app.get('/Schedule', (function (req, res) {
    if (req.User.type == "Admin" || req.User.type == "Manager") {
        connection.query("SELECT Doctors.UID, Users.Fname,Users.Lname,Specialty.Specialty,Doctors.Experience,Users.DateOfCreation  from Doctors Inner JOIN Users on Users.UID=Doctors.UID Inner JOIN Specialty on Specialty.SPID=Doctors.SPID", [req.User.userID], function (error, results, fields) {
            if (error) throw error;
            res.render("Schedule", {i: results, userID: req.User.userID, type: req.User.type, HID: req.User.HID});

        });
    } else {
        res.redirect("/")
    }
}));
app.get('/HospitalsPage', (function (req, res) {
    if (req.User.type == "Admin" || req.User.type == "Manager") {
        connection.query("SELECT HID,HName,Cname,Location,SID from Hospitals Inner JOIN Cities on Hospitals.CID = Cities.CID", function (error, results, fields) {
            res.render("HospitalsPage", {i: results, userID: req.User.userID, type: req.User.type, HID: req.User.HID});

        });
    } else {
        res.redirect("/")
    }
}));
app.get('/ManagersPage', (function (req, res) {
    if (req.User.type == "Admin" || req.User.type == "Manager") {
        connection.query("SELECT Managers.SID,Managers.MID,Managers.UID, Users.Fname,Users.Lname,Hospitals.HName,Users.DateOfCreation from Managers Inner JOIN Users on Managers.UID=Users.UID Inner JOIN Hospitals on Managers.HID= Hospitals.HID", function (error, results, fields) {
            res.render("ManagersPage", {i: results, userID: req.User.userID, type: req.User.type, HID: req.User.HID});

        });
    } else {
        res.redirect("/")
    }
}));
app.get('/AddShift', (function (req, res) {
    if ( req.User.type == "Manager" ) {
        connection.query("select D.DID, U.Fname,U.Lname from Doctors as D inner join Users as U on U.UID=D.UID where D.HID=? and D.SID=5",[req.User.HID], function (error, results, fields) {
            if (error) throw error;
            res.render("AddShift", {Dr: results, userID: req.User.userID, type: req.User.type, HID: req.User.HID});
        })

    }
    else if (req.User.type == "Admin" ) {
        connection.query("select D.DID, U.Fname,U.Lname from Doctors as D inner join Users as U on U.UID=D.UID where  D.SID=5", function (error, results, fields) {
            if (error) throw error;
            console.log(results)
            res.render("AddShift", {Dr: results, userID: req.User.userID, type: req.User.type, HID: req.User.HID});
        })
    }     else if (req.User.type == "Doctor" ) {
        connection.query("select D.DID, U.Fname,U.Lname from Doctors as D inner join Users as U on U.UID=D.UID where  D.SID=5 and U.UID=?", [req.User.userID], function (error, results, fields) {
            if (error) throw error;
            console.log(results)
            res.render("AddShift", {Dr: results, userID: req.User.userID, type: req.User.type, HID: req.User.HID});
        })
    }
    else {
        res.redirect("/")
    }
}));
app.get('/ScheduleAppointment', function (req, res) {
    list = []
    doctor = []
    ress = []
    dateA=new Date("2021-4-12")
    dateA.setDate(dateA.getDate()-dateA.getDay())
    console.log(dateA.getDate())
    stri=dateA.getFullYear()+"-"+(dateA.getMonth()+1)+"-"+dateA.getDate()
    if (req.User.userID) {
        connection.query('Select D.DID, D.DName, D.SPID,A.Date,A.STime,A.ETime from Doctors as D INNER JOIN DoctorAvailability as A on D.DID =A.DID  ', [req.body.SP, req.body.Adate], function (error, results, fields) {
            if (error) throw error;
            connection.query('Select D.DID, D.DName, D.SPID, AP.ADate,AP.ATime,AP.Length,AP.Status from Doctors as D Inner join Appointments as AP on AP.DID=D.DID  ', function (error2, results2, fields) {
                if (error2) throw error2;
                connection.query('Select * from Specialty',function (error3, results3, fields) {
                    if (error3) throw error3;
                    connection.query('Select * from Hospitals', [req.body.SP, req.body.Adate], function (error4, results4, fields) {
                        if (error4) throw error4;
                    ress = results2
                    for (i = 0; i < results.length; i++) {
                        DID = results[i].DID
                        len = toM(results[i].ETime, results[i].STime)
                        part = len / 20

                        for (x = 0; x < part; x++) {
                            time = new Date(results[i].STime)
                            var te1 = results[i].STime.split(':');
                            var m1 = (+te1[0]) * 60 + (+te1[1]) + 20 * x;
                            if (m1 % 60 == 0) ST = Math.floor(m1 / 60) + ":00:00"
                            else ST = Math.floor(m1 / 60) + ":" + m1 % 60 + ":00"
                            slot = [ST, 0, DID]
                            for (s = 0; s < ress.length; s++) {
                                var te2 = ress[s].ATime.split(':');
                                test = (+te2[0]) * 60 + (+te2[1]);
                                if (test == m1 && DID == ress[s].DID) {
                                    slot = [ST, 1]
                                    break;
                                }
                            }

                            doctor.push(slot)

                        }
                        list.push([doctor, results[i]])
                        doctor = []
                    }
                    res.render("ScheduleAppointment", {
                        SP: results3,
                        listD: list,
                        userID: req.User.userID,
                        type: req.User.type,
                        Hos:results4
                        , HID: req.User.HID
                    })
                });
            });
        });
    })} else {
        res.redirect("/")
    }
});
app.get('/DoctorPerformence', function (req, res) {
    if (req.User.type == "Admin" || req.User.type == "Manager") {
        connection.query("select Fname,Lname,GovID,Username,Gender,DoB,ContactNo,Address,Email,Cname as City from Users Inner join Cities on Cities.CID=Users.City Where UID=?", [req.User.userID], function (error, results, fields) {
            console.log(results[0].DoB)
            dd = new Date(results[0].DoB)
            console.log(dd)
            date1 = dd.getFullYear() + "/" + dd.getMonth() + "/" + dd.getDate()
            res.render("DoctorPerformence", {userID: req.User.userID, type: req.User.type, HID: req.User.HID});
        })
    } else {
        res.redirect("/")
    }
});
app.get('/HospitalPerformence/:id', function (req, res) {
    if (req.User.type == "Admin" || req.User.type == "Manager") {
        connection.query("SELECT COUNT(A.AID) as count ,S.Specialty FROM Appointments as A inner JOIN Doctors as D on D.DID= A.DID inner join Specialty as S on D.SPID=S.SPID WHERE A.HID=?  GROUP by D.SPID", [req.params.id], function (error, results, fields) {
            if (error) throw error
            connection.query("select COUNT(D.DID) as count , S.Specialty FROM Doctors as D inner join Specialty as S on S.SPID=D.SPID  where D.SID =5 and D.HID =? group by D.SPID", [req.params.id], function (error1, results1, fields) {
                if (error1) throw error1
                res.render("HospitalPerformence", { num: results1,i:results,userID: req.User.userID, type: req.User.type, HID: req.User.HID});
        })
    })
        } else {
        res.redirect("/")
    }
});
app.get('/login', function (req, res) {
    if (req.User.userID) {
        res.redirect("/");
    } else {

        res.render("login", {userID: req.User.userID, type: req.User.type, HID: req.User.HID});
    }

});
app.get('/register', function (req, res) {
    if (req.User.userID) {
        res.redirect("/");
    } else {
        connection.query("select * from Cities", [req.User.userID], function (error, results, fields) {
            res.render("register", {userID: 0, type: null ,Cities:results});
        })
    }

});
app.get("/sign-out", function (request, response) {
    request.User.userID = "";
    request.User.type = "";
    response.redirect("/");
});
app.get("/profile", function (req, res) {
    console.log(req.User)
    if (req.User.userID) {
        connection.query("select Fname,Lname,GovID,Username,Gender,DoB,ContactNo,Address,Email,Cname as City from Users Inner join Cities on Cities.CID=Users.City Where UID=?", [req.User.userID], function (error, results, fields) {
            console.log(results[0].DoB)
            dd = new Date(results[0].DoB)
            console.log(dd)
            date1 = dd.getFullYear() + "/" + dd.getMonth() + "/" + dd.getDate()
            res.render("profile", {i: results[0], DoB: date1, userID: req.User.userID, type: req.User.type, HID: req.User.HID})
        })
    } else {
        res.redirect("/")
    }
});
app.get('/usersPage/:id', function (req, res) {
    if (req.User.type == "Admin" || req.User.type == "Manager") {
        connection.query("select Fname,Lname,GovID,Username,Gender,DoB,ContactNo,Address,Email,Cname as City from Users Inner join Cities on Cities.CID=Users.City Where UID=?", [req.params.id], function (error, results, fields) {
            console.log(results[0].DoB)
            dd = new Date(results[0].DoB)
            console.log(dd)
            date1 = dd.getFullYear() + "/" + dd.getMonth() + "/" + dd.getDate()
            res.render("profile", {i: results[0], DoB: date1, userID: req.User.userID, type: req.User.type, HID: req.User.HID})
        })
    } else {
        res.redirect("/")
    }
});
app.get("/removeD/:id", function (req, res) {

    if (req.User.type == "Manager" || req.User.type == "Admin") {
        console.log(req.params.id)
        connection.query("UPDATE Doctors SET SID=4 WHERE DID=? ", [req.params.id], function (error, results, fields) {
            if (error) throw error;
            console.log("you made it here")
            res.redirect("/DoctorsPage")
        });
    }
    else res.redirect("/")
});
app.get("/addD/:id", function (req, res) {
    if (req.User.type == "Manager" || req.User.type == "Admin") {
        connection.query('UPDATE  Doctors SET SID=5 WHERE DID=?', [req.params.id], function (error, results, fields) {
            if (error) throw error;
            res.redirect("/DoctorsPage")
        });
    }else res.redirect("/")
});
app.get("/removeH/:id", function (req, res) {

    if (req.User.type == "Manager" || req.User.type == "Admin") {
        connection.query("UPDATE Hospitals SET SID=2 WHERE HID=? ", [req.params.id], function (error, results, fields) {
            if (error) throw error;
            res.redirect("/HospitalsPage")
        });
    }
    else res.redirect("/")
});
app.get("/addH/:id", function (req, res) {

    if (req.User.type == "Manager" || req.User.type == "Admin") {
        connection.query("UPDATE Hospitals SET SID=5 WHERE HID=? ", [req.params.id], function (error, results, fields) {
            if (error) throw error;
            res.redirect("/HospitalsPage")
        });
    }
    else res.redirect("/")
});
app.get("/removeM/:id", function (req, res) {

    if (req.User.type == "Manager" || req.User.type == "Admin") {
        connection.query("UPDATE Managers SET SID=2 WHERE MID=? ", [req.params.id], function (error, results, fields) {
            if (error) throw error;
            res.redirect("/ManagersPage")
        });
    }
    else res.redirect("/")
});
app.get("/addM/:id", function (req, res) {

    if (req.User.type == "Manager" || req.User.type == "Admin") {
        connection.query("UPDATE Managers SET SID=5 WHERE MID=? ", [req.params.id], function (error, results, fields) {
            if (error) throw error;
            res.redirect("/ManagersPage")
        });
    }
    else res.redirect("/")
});
app.get("/deleteA/:id", function (req, res) {

    if (req.User.type == "Manager" || req.User.type == "Admin") {
        connection.query("DELETE FROM DoctorAvailability  WHERE DAID=? ", [req.params.id], function (error, results, fields) {
            if (error) throw error;
            res.redirect("/DoctorAvailability")
        });
    }
    else res.redirect("/")
});
app.get("/deleteAp/:id", function (req, res) {

    if (req.User.userID) {
        connection.query("DELETE FROM Appointments  WHERE AID=? ", [req.params.id], function (error, results, fields) {
            if (error) throw error;
            res.redirect("/")
        });
    }
    else res.redirect("/")
});
app.get("/deleteH/:id", function (req, res) {

    if (req.User.type == "Manager" || req.User.type == "Admin") {
        connection.query("DELETE FROM Hospitals  WHERE HID=? ", [req.params.id], function (error, results, fields) {
            if (error) throw error;
            res.redirect("/HospitalsPage")
        });
    }
    else res.redirect("/")
});
app.get("/deleteM/:id", function (req, res) {

    if (req.User.type == "Manager" || req.User.type == "Admin") {
        connection.query("select UID From Managers where MID=?",[req.params.id], function(error1, resu,field) {
            connection.query("DELETE FROM Managers  WHERE MID=? ", [req.params.id], function (error, results, fields) {
                if (error) throw error;
                connection.query('UPDATE  Users SET UserType="Patient" WHERE UID=?', [resu[0].UID], function (error, results, fields) {
                    if (error) throw error;

                res.redirect("/ManagersPage")
            });
        })})
        }
    else res.redirect("/")
});
app.get("/deleteD/:id", function (req, res) {

    if (req.User.type == "Manager" || req.User.type == "Admin") {
        connection.query("select UID From Doctors where DID =?",[req.params.id], function(error1, resu,field){


        connection.query("DELETE FROM Doctors  WHERE DID=? ", [req.params.id], function (error, results, fields) {
            if (error) throw error;
            connection.query('UPDATE  Users SET UserType="Patient" WHERE UID=?', [resu[0].UID], function (error, results, fields) {
                if (error) throw error;


            res.redirect("/DoctorsPage")
            });
            });
        })

    }
    else res.redirect("/")
});


app.post("/login", function (req, res) {
    var result;
    console.log(req.body)
    scrypt(req.body.Password, "AhmedAndMustafa", {
        N: 4096,
        r: 8,
        p: 1,
        dkLen: 150,
        encoding: 'hex'
    }, function (derivedKey) {
        result = derivedKey;
    });
    console.log(result)
    connection.query("select UID,UserType from Users where UserName=? and Password=?", [req.body.User, result], function (error, results, fields) {
        if (error) throw error;
        if (results[0]) {
            req.User.userID = results[0].UID;
            req.User.type = "Patient";
            if (results[0].UserType == "Doctor") {
                connection.query("select SID from Doctors where UID=? ", [results[0].UID], function (erro, result, field) {
                        if (error) throw error;
                        if (result[0].SID == 5) {
                            req.User.type = results[0].UserType;
                            console.log("he made it here")
                            res.redirect("/");
                        } else res.redirect("/");
                    }
                )
            } else if (results[0].UserType == "Manager" || results[0].UserType == "Admin") {
                connection.query("select SID,HID from Managers where UID=? ", [results[0].UID], function (erro, result, field) {
                        if (error) throw error;
                        if (result[0].SID == 5) {
                            req.User.type = results[0].UserType;
                            req.User.HID= result[0].HID;
                            console.log("he made it here")
                            res.redirect("/");
                        } else res.redirect("/");
                    }
                )
            } else {
                console.log(req.User)
                res.redirect("/");
            }
        } else
            res.render("login", {error: "username or password is wrong",userID: req.User.userID, type: req.User.type, HID: req.User.HID});
    });

});
app.post("/register", function (req, res) {
    var result;
    scrypt(req.body.Password, "AhmedAndMustafa", {
        N: 4096,
        r: 8,
        p: 1,
        dkLen: 150,
        encoding: 'hex'
    }, function (derivedKey) {
        result = derivedKey;
        console.log(result)
    });
    console.log(req.body.Gender)

    connection.query('insert into Users () values(null,?,?,?,"Patient",?,?,?,?,?,?,?,CURRENT_TIMESTAMP,?)', [req.body.Fname, req.body.Lname, req.body.GovID, req.body.Username, result, req.body.Gender, req.body.DoB, req.body.ContactNo,req.body.Address, req.body.Email, req.body.CID], function (error, results, fields) {
        if (error) throw error;
        res.redirect("/login")
    });

    res.redirect("/");
});

app.post("/updateDoctor", function (req, res) {
    if (req.User.type == "Manager" || req.User.type == "admin") {
        connection.query('UPDATE  Doctors SET SID=? WHERE DID=?', [req.body.num,req.body.DID], function (error, results, fields) {
            if (error) throw error;
        });
    }
});
app.post("/updateManager", function (req, res) {
    if (req.User.type == "Manager" || req.User.type == "admin") {
        connection.query('UPDATE  Managers SET SID=? WHERE MID=?', [req.body.num,req.body.DID], function (error, results, fields) {
            if (error) throw error;
        });
    }
});
app.post("/updateHospital", function (req, res) {
    if (req.User.type == "Manager" || req.User.type == "admin") {
        connection.query('UPDATE  Doctors SET SID=? WHERE HID=?', [req.body.num,req.body.HID], function (error, results, fields) {
            if (error) throw error;
        });
    }
});

app.post("/AddDoctor",  function (req, res) {
    console.log(req.body)
    if (req.User.type == "Admin" || req.User.type == "Manager") {
        var result;
        scrypt(req.body.Password, "AhmedAndMustafa", {
            N: 4096,
            r: 8,
            p: 1,
            dkLen: 150,
            encoding: 'hex'
        }, function (derivedKey) {
            result = derivedKey;
        });
        connection.query('insert into Users () values(null,?,?,?,"Doctor",?,?,?,?,?,?,?,CURRENT_TIMESTAMP,?)', [req.body.Fname, req.body.Lname, req.body.GovID, req.body.Username, result, req.body.Gender, req.body.DoB, req.body.ContactNo, req.body.Address, req.body.Email,req.body.CID], function (error, results, fields) {
            if (error) throw error;
            console.log("not there")
            console.log()
            connection.query('insert into Doctors () values(null,?,?,?,?,?,5)', [results.insertId, req.body.HID, req.body.Fname, req.body.Experience,  req.body.SPID], function (erro, result, field) {
                if (erro) throw erro;
                console.log("here")
                res.redirect("/DoctorsPage")
            });
        });
    }else{
        res.redirect("/?massage=doctor has been added ")
    }
});
app.post("/AddManager", function (req, res) {
    if (req.User.type == "Admin" || req.User.type == "Manager") {
        var result;
        scrypt(req.body.Password, "AhmedAndMustafa", {
            N: 4096,
            r: 8,
            p: 1,
            dkLen: 150,
            encoding: 'hex'
        }, function (derivedKey) {
            result = derivedKey;
        });
        connection.query('insert into Users () values(null,?,?,?,"Manager",?,?,?,?,?,?,?,CURRENT_TIMESTAMP,?)', [req.body.Fname, req.body.Lname, req.body.GovID, req.body.Username,  result, req.body.Gender, req.body.DoB, req.body.ContactNo, req.body.Address, req.body.Email, req.body.CID], function (error, results, fields) {
            if (error) throw error;
            connection.query('insert into Managers () values(null,?,5,?)', [results.insertId, req.body.HID], function (erro, result, field) {
                if (erro) throw erro;
                res.redirect("/ManagersPage")
            });
        });
    }
});
app.post("/AddHospital", function (req, res) {
    if (req.User.type == "Admin" || req.User.type == "Manager") {
        connection.query('insert into Hospitals () values(null,?,?,?,5)', [req.body.HName, req.body.Location, req.body.CID], function (error, results, fields) {
            if (error) throw error;
            res.redirect("/HospitalsPage")
        })
    }

})
app.post("/AddShift", function (req, res) {
    if (req.User.type == "Admin" || req.User.type == "Manager" || req.User.type == "Doctor" ) {
        connection.query('insert into DoctorAvailability() values(null,?,?,?,?)', [req.body.DID,req.body.DoB,req.body.STime1+":"+req.body.STime2+":00",req.body.ETime1+":"+req.body.ETime2+":00"], function (error, results, fields) {
            if (error) throw error;
            res.redirect("/DoctorAvailability")

        });
    } else {
        res.redirect("/")
    }
});
app.post("/Appointments-Schedule", function (req, res) {
    if (req.User.userID) {
        connection.query('insert into Appointments() values(null,?,?,?,?,?,20,3)', [req.User.userID,req.body.DIDn,req.body.HIDn,req.body.DoBn,req.body.timen], function (error, results, fields) {
            if (error) throw error;
            res.redirect("/")

        });
    } else {
        res.redirect("/")
    }
});
app.post("/UserEdit", function (req, res) {
    if (req.User.userID) {
        console.log(req.body)
        connection.query("UPDATE  Users SET Fname=? , Lname=? , GovID=?, Username=? , Gender=? , DoB=? , Email=? , ContactNo=? Where UID=?", [req.body.Fname, req.body.Lname, req.body.GovID, req.body.Username, req.body.Gender, req.body.DoB, req.body.Email, req.body.ContactNo, req.User.userID], function (error, results, fields) {
            console.log("yo")
            res.redirect("/profile")
        });
    }
});
app.post("/ContactEdit", function (req, res) {
    if (req.User.userID) {
        console.log(req.User)

        connection.query("UPDATE  Users SET Address=? , City=? Where UID=?", [req.body.Address, req.body.City, req.User.userID], function (error, results, fields) {
            console.log("cahnge")
            res.redirect("/profile")
        });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('server started in port:  ' + PORT));
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