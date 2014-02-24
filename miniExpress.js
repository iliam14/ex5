/**
 * Created by Ilia and Liad
 */
var fs = require('fs');
var miniHttp = require("./miniHttp");


//conecstructor for items for server database
function item(res,func,when)
{
    if(func == undefined )
    {
        this.func=res;
        this.res ='/';
        this.regx ="/";
        this.whenOccuer = when;
        this.array = [];
    }
    else
    {
    this.res =res;
    this.func=func;
    this.whenOccuer = when;
    this.regx ="";


        var i=0;
        var arr = [];
        while(i < res.length)
        {
            var count = 1;
            if(res.charAt(i) == ':')
            {
                this.regx+="([^/]+)";
                i++;
                arr[count]="";
                while(i < res.length && res.charAt(i) != '/')
                {
                    arr[count] += res.charAt(i);
                    i++;
                }
                count++;
            }
            else
            {
                this.regx+=res.charAt(i);
                i++;
            }
        }
        this.array = arr;
    }
}

//the queue of folders with access
queue = {
    itemArray:[""],
    counter:0,
    notComplete:function(location)
    {
        if(location > this.counter)
        {
            return false;
        }
        else
        {
            return true;
        }
    },
    push:function(res,func,when)
    {
    this.counter = this.counter + 1;
        this.itemArray.push(new item(res,func,when));
    },

    getItemAt:function(i)
    {
        return this.itemArray[i];
    }
};


//consturctor for server
miniExpress = function(){
    var server;
    var app = function(req, res){
        if(req.path!= '/favicon.ico')
        {
            //search for the file path in the queue


            var location = 1;

            var next = function(){

                var found = false;
                while(queue.notComplete(location))
                {

                    var patt=new RegExp(queue.getItemAt(location).regx);

                    if(patt.test(req.path) && (req.postMethod == queue.getItemAt(location).whenOccuer
                                                    || queue.getItemAt(location).whenOccuer == 'always'))
                    {

                        location = location +1;
                     //   req.params = {};
                        var match =patt.exec(req.path);
                        if(queue.getItemAt(location-1).regx == '/')
                        {
                            req.filePath = req.path;
                        }
                        else
                        {
                        req.filePath = req.path.replace(match[0],"");
                        }
                        var i=1;
                        var theArray = queue.getItemAt(location-1).array;

                        while (match[i] != undefined) {

                            var prop = theArray[1];
                            req.params[prop] = match[i];

                            i++;
                        }

                        //if found get the item
                        queue.getItemAt(location-1).func(req,res,next);
                        found=true;
                        break;
                    }
                    else
                    {

                        location = location +1;
                    }

                }

                if (found == true)
                {
                    return true;
                }
                else
                {
                    return false;
                }
            }

            if(!next())
            {


                res.send(404, 'FileNotFound');

            }
        }
    }
    app.listen=function(port, callback)
        {
            if (server == undefined)
                server = miniHttp.createServer(this);
            server.listen(port, callback);
        };
    app.close=function()
        {
            if(server != undefined)
                server.close();
        };
    app.use=function(res,func)
        {
            queue.push(res,func,'always');
        };
    app.get=function(res,func)
        {
            queue.push(res,func,'GET');
        };
    app.post=function(res,func)
        {
            queue.push(res,func,'POST');
        },
    app.put=function(res,func)
        {
            queue.push(res,func,'PUT');
        };
    app.delete=function(res,func)
        {
            queue.push(res,func,'DELETE');
        };
    app.route=function()
        {
            var location=1;
            var routeString = [];
            var notEmpty = [];
            routeString['GET'] = "";
            routeString['PUT'] = "";
            routeString['DELETE'] = "";
            routeString['POST'] = "";
            var finalString = "{ ";
            while(queue.notComplete(location))
            {
                if(notEmpty[queue.getItemAt(location).whenOccuer] == true)
                {
                    routeString[queue.getItemAt(location).whenOccuer] +=', \n';
                }
                routeString[queue.getItemAt(location).whenOccuer] +='{ path: ' + queue.getItemAt(location).res + '\n';
                routeString[queue.getItemAt(location).whenOccuer] +='method: ' + queue.getItemAt(location).whenOccuer + '\n';
                routeString[queue.getItemAt(location).whenOccuer] +='callback: ' + '[object]' + '/n';
                routeString[queue.getItemAt(location).whenOccuer] +='keys: ' + '\n';
                routeString[queue.getItemAt(location).whenOccuer] +='regexp: '  + queue.getItemAt(location).regx + '}';
                notEmpty[queue.getItemAt(location).whenOccuer] = true;
                location = location +1;
            }
            if(notEmpty['GET'] == true)
            {
            finalString += 'get: \n [ ' + routeString['GET'] + ']\n';
            }
            if(notEmpty['POST'] == true)
            {
                finalString += 'post: \n [' + routeString['POST'] + ']\n';
            }
            if(notEmpty['PUT'] == true)
            {
                finalString += 'put: \n [' + routeString['PUT'] + ']\n';
            }
            if(notEmpty['DELETE'] == true)
            {
                finalString += 'delete: \n [' + routeString['DELETE'] + ']\n';
            }
            finalString+= '}';
            this.route = finalString;
        };

    return app;
};


//this function get directory and return the function that read files from that directory
miniExpress.static = function(prefixDirectory) {
    return function(req,res,next) {

        if(req.postMethod == "GET")
        {

            if(req.filePath.slice(-1) == '/')
                req.filePath+= 'index.html';

            fs.readFile(prefixDirectory + req.filePath,function(err,data) {


            if(data == undefined)
            {

                res.status(404);
                res.set("Content-Type",'text/html');
                res.body = "<html><head><title>ERROR</title></head><body>404 cant find the file</body></html>";
                res.send(404,res.body);
            }
            else
            {

                res.status(200);
                var fileEnding = req.filePath.substring(req.filePath.indexOf('.')+1);
                switch  (fileEnding.toUpperCase())
                {
                    case "TXT":
                        res.set('Content-Type','text/plain');
                        res.set('Content-Length',data.length.toString());
                        break;
                    case "HTML":
                        res.set('Content-Type','text/html');
                        res.set('Content-Length',data.length.toString());
                        break;
                    case "JS":
                        res.set('Content-Type','application/javascript');
                        res.set('Content-Length',data.length.toString());
                        break;
                    case "CSS":
                        res.set('Content-Type','text/css');
                        res.set('Content-Length',data.length.toString());
                        break;
                    case "JPEG":
                        res.set('Content-Type','image/jpeg');
                        res.set('Content-Length',data.length.toString());
                        break;
                    case "JPG":
                        res.set('Content-Type','image/jpeg');
                        res.set('Content-Length',data.length.toString());
                        break;
                    case "GIF":
                        res.set('Content-Type','image/gif');
                        res.set('Content-Length',data.length.toString());
                        break;


                }
                res.send(200,data);

            }
        });
        }
        else
        {
            next();
        }

    };
}

miniExpress.cookieParser = function() {
    return function(req,res, next) {
        req.cookies = [];
        var cookieLine = req.get("Cookie");

    if(cookieLine == undefined)
    {
        next();
    }
    else
    {
        var patt=new RegExp('([^;]+)=([^;]+);?');
        while(patt.test(cookieLine))
        {
            var match =patt.exec(cookieLine);
        var key =match[1];
        var value = match[2];
        req.cookies[key] = value.replace(/^\"|\"$/g, "");
        cookieLine =  cookieLine.replace(match[0],'');
        }
       next();
    }
    };
}

miniExpress.json = function() {
    return function(req,res, next) {
	var length2 = req.get('content-length');
       var body2 = req.body;
	try{
        if(body2 != undefined && body2!=" ");
            {
            var parsedJSON = JSON.parse(body2);
            req.body = parsedJSON;
            }
        }
		
        catch(err)
        {


        }
        finally
        {

            next();
        }
    };
}

miniExpress.urlencoded = function() {
    return function(req,res, next) {

        var type = req.get('content-type');
        var length = req.get('content-length');
        var patt2 = new RegExp('application/x-www-form-urlencoded');
        if(patt2.test(type))
        {

            var body = req.body;
            req.body={};
            var patt=new RegExp('([^&]+)=([^&]+)&');
            while(patt.test(body))
            {
                var match =patt.exec(body);
                var key =match[1];
                var value = match[2];
                value = unescape(value).replace(/\+/g,' ');
                req.body[key] = value;
                body =  body.replace(match[0],'');
            }
            patt=new RegExp('([^&]+)=([^&]+)');
            if(patt.test(body))
            {
                var match =patt.exec(body);
                var key =match[1];
                var value = match[2];
                value = unescape(value).replace(/\+/g,' ');
                req.body[key] = value;
                body =  body.replace(match[0],'');
            }
		}
		next();
    };
}



miniExpress.bodyParser = function() {
    var j = miniExpress.json();
    var u = miniExpress.urlencoded();

    return function(req,res, next) {


        var type = req.get('content-type');
        var length = req.get('content-length');
        var patt2 = new RegExp('application/x-www-form-urlencoded');
		var length = req.get('content-length');
        var body = req.body;
        if(patt2.test(type))
        {

            var body = req.body;
            req.body={};
            var patt=new RegExp('([^&]+)=([^&]+)&');
            while(patt.test(body))
            {
                var match =patt.exec(body);
                var key =match[1];
                var value = match[2];
                value = (value).replace(/\+/g,' ');
                req.body[key] = value;
                body =  body.replace(match[0],'');
            }
            patt=new RegExp('([^&]+)=([^&]+)');
            if(patt.test(body))
            {
                var match =patt.exec(body);
                var key =match[1];
                var value = match[2];
                value = unescape(value).replace(/\+/g,' ');
                req.body[key] = value;
                body =  body.replace(match[0],'');
            }
        }
		
        try
        {
            if(body2 != undefined && body2!=" ");
            {
            var parsedJSON = JSON.parse(body2);
            req.body = parsedJSON;
            }
        }
        catch(err)
        {


        }
        finally
        {

            next();
        }
    };
}

module.exports =miniExpress;


