/**
 * Created by Ilia Merin and liad on 12/02/14.
 */
var miniExpress = require('./miniExpress');
//var express = require('express');
var uuid = require('node-uuid')
var app = miniExpress();

app.use(miniExpress.urlencoded());
app.use(miniExpress.cookieParser());
app.get('/login',function(req,res,next){
    var uname = req.param('username');
    if(uname == undefined)
    {
        return next();
    }
    var pass = req.param('pass');
    var dbPass = undefined;
    if(users.hasOwnProperty(uname))
    {
        dbPass = users[uname].pass;
    }
    if(dbPass == pass && dbPass != undefined)
    {
        var cur_id = uuid.v1();
        ids[cur_id] = uname;
        res.cookie('sessionId',cur_id);
        res.set('Content-Type','text/plain');
        res.set('Content-Length','1');
        res.send(200,'1');
        return 1;
    }
    else
    {
        res.cookie('sessionId') == '';
        res.set('Content-Type','text/plain');
        res.set('Content-Length','16');
        res.send(500,'bad uname or pass');
        return 0;
    }
});


var loginByCookie = function(req,res){
    if(req.cookies.sessionId != undefined)
    {
        var curUser = users[ids[req.cookies.sessionId]];
        if(!curUser)
        {
            return false;
        }
        return true;
    }
    return false;
};

app.get('/item',function(req,res,next){
    if (!loginByCookie(req,res)){
        res.set('Content-Type','text/plain');
        res.set('Content-Length','20');
        res.send(400,'no cookie or expirad');
        return 0;
    }

    var curUser = users[ids[req.cookies.sessionId]];
    res.json(200,curUser.list);
    return 1;
});

app.post('/item',function(req,res,next){
    if (!loginByCookie(req,res)){
        res.set('Content-Type','text/plain');
        res.set('Content-Length','20');
        res.send(400,'no cookie or expirad');
        return ;
    }
    //
    var curUser = users[ids[req.cookies.sessionId]];
    curUser.list[curUser.maxId] ={text: req.body.name ,
                                   id: curUser.maxId,
                                    status:false};
    curUser.maxId++;
    res.json(200,curUser.list);
    return 1;
});

app.put('/item',function(req,res,next){
    if (!loginByCookie(req,res)){
        res.set('Content-Type','text/plain');
        res.set('Content-Length','20');
        res.send(400,'no cookie or expirad');
        return 0;
    }
    //
    var curUser = users[ids[req.cookies.sessionId]];
    curUser.list[req.body.id].status =  (req.body.status == 'true'); // we got it as text
    curUser.list[req.body.id].text = req.body.name;
    res.json(curUser.list);
    res.set('Content-Type','text/plain');
    res.set('Content-Length','1');
    res.send(200,'1');
    return 1;
});

app.delete('/item',function(req,res,next){
    if (!loginByCookie(req,res)){
        res.set('Content-Type','text/plain');
        res.set('Content-Length','20');
        res.send(400,'no cookie or expirad');
        return ;
    }

    var curUser = users[ids[req.cookies.sessionId]];
    if (req.body.id == -1)
    {
        for(var item in curUser.list){
            if(curUser.list[item].status){
                delete curUser.list[item];
            }
        }
        res.json(curUser.list);
        res.set('Content-Type','text/plain');
        res.set('Content-Length','1');
        res.send('1');
        return 1;
    }
    else if( curUser.list[req.body.id] != undefined) { // Make sure the value exists
        delete curUser.list[req.body.id];
        res.json(curUser.list);
        res.set('Content-Type','text/plain');
        res.set('Content-Length','1');
        res.send(200,'1');
        return 1;
    }
    else
    {
        res.set('Content-Type','text/plain');
        res.set('Content-Length','1');
        res.send(500,'0');
        return 0;
    }

});





app.post('/register',function(req,res){

    if(users[req.body.username] != undefined)
    {
        res.set('Content-Type','text/plain');
        res.set('Content-Length','13');
        res.send(500,'same id again');
        return 0;
    }
    var cur_id = uuid.v1();
    users[req.body.username] = {
        pass: req.body.password,
        name: req.body.fullname,
        uid: cur_id,
        maxId:0,
        list: {}
    }
    ids[cur_id] = req.body.username;
    res.cookie('sessionId',cur_id);
    res.set('Content-Type','text/plain');
    res.set('Content-Length','1');
    res.send(200,"1");
    return 1;
});

app.use(miniExpress.static(__dirname + '/www'));
var users = {};
var ids = {};


app.listen(process.env.PORT || 8080);

