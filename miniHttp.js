/**
 * Created by Liad and Ilia
 */
//this function receive the request and extract the important parts from it

var net = require('net');


var parseQuery = function(queryStr){
    var q = {};
    if (queryStr == '')
        return q;
    var queuryParts = queryStr.split('&')
    var arrayDef = new RegExp('(\\w+)(\\[(\\w+)\\])?=(\\w+\\+?\\w*)')
    for (var query in queuryParts ){
        if( !arrayDef.test(queuryParts[query]))
        {
            return undefined;
        }
        var match = arrayDef.exec(queuryParts[query]);

        match[4] = match[4].replace('+',' ');
        if (match[3] == undefined)
            q[match[1]]=match[4];
        else{
            if (q[match[1]]==undefined)
                q[match[1]] = {};
            q[match[1]][match[3]]=match[4]
        }
    }
    return q;
}

parser = function(socketString) {

    var request = {} ;
    request.params = {};
    request.string = socketString.toString();
    //get the first line
    var place = socketString.indexOf("\n");

    if(place == -1)
    {
        errorstatus ="BadHTTP";
        throw errorstatus;
    }

    var reqParts = socketString.split('\r\n\r\n');

    var lines = reqParts[0].split('\n').slice(2);
    var firstline = reqParts[0].substring(0,place).replace('\r','');

    var partsFirstline = firstline.split(' ');
    //get the type e.g get post
    if(partsFirstline.length != 3)
    {
        errorstatus ="BadHTTP";
        throw errorstatus;
    }
    request.postMethod = partsFirstline[0];
    var resource = partsFirstline[1];
    var tempFirstLine = partsFirstline[1];
    //look for paramters
    var patt=new RegExp('([^&?]+)=([^&]+)&');
    while(patt.test(tempFirstLine))
    {
        var match =patt.exec(tempFirstLine);
        var key =match[1];
        var value = match[2];
        value = unescape(value).replace(/\+/g,' ');
        request.params[key] = value;
        tempFirstLine =  tempFirstLine.replace(match[0],'');
    }
    patt=new RegExp('([^&?]+)=([^&]+)');
    if(patt.test(tempFirstLine))
    {
        var match =patt.exec(tempFirstLine);
        var key =match[1];
        var value = match[2];
        value = unescape(value).replace(/\+/g,' ');
        request.params[key] = value;
        tempFirstLine =  tempFirstLine.replace(match[0],'');
    }
    var protocol = partsFirstline[2].split('/');

    request.protocol = protocol[0].toLowerCase();
    var isHTTP = protocol[0];

    var path;
    path= resource;

    if(request.postMethod == "GET")
    {
        var pathParts = path.split('?');
        path = pathParts[0];
        if(pathParts[1] != undefined)
        {
        request.query = parseQuery(pathParts[1]);
        }
        else
        {
            request.query = {};
        }
    }
    else // POST
    {
        request.query = {};
    }


    request.path = path;
    request.body =reqParts[1];

    this.httpVer = protocol[1];
    if (this.httpVer !== "1.0" && this.httpVer !== "1.1" )
    {
        errorstatus ="BadHTTP";
        throw errorstatus;
    }
    if(isHTTP !== "HTTP")
    {
        errorstatus ="BadHTTP";
        throw errorstatus;
    }

    var hostFound = false;
    for (var lineNum in lines)
    {
        var line = lines[lineNum].trim();
        if (line.length == 0)
            break;
        var args = line.split(':');
        request[args[0].trim()] = args[1].trim(); // this will add host
        if (args[0].trim().toLowerCase() == "host")
        {
            hostFound = true;
        }
    }

    if (!hostFound)
    {
        request.host = undefined;
    }

    request.get = function(getField){
        for (var field in this)
        {
            if (getField.toLowerCase() === field.toLowerCase())
            {
                return this[field];
            }
        }
        return undefined;
    }

    request.param = function(getField){
        for (var field in this.params)
        {
            if (getField.toLowerCase() === field.toLowerCase())
            {
                return this.params[field];
            }
        }
        return undefined;
    }

    request.is = function(type)
    {
        return (this['Content-Type'] == type || this['Content-Type'].split('/')[1] == type);

    }

    return request;
};

//this function return if the connection should close or not
parser.keepAlive= function(socketString)
{
    var isConnectionKeepAlive = true;
    var HTTPVersion = socketString.substring(socketString.indexOf("HTTP") + 5,socketString.indexOf("HTTP") + 8);
    var connectionKeepAlivePlace = socketString.indexOf("Connection: keep-alive");
    var connectionClosePlace = socketString.indexOf("Connection: close");
    if(HTTPVersion == 1.0)
    {


        if(connectionKeepAlivePlace != -1)
        {
            isConnectionKeepAlive=true;
        }
        else
        {
            isConnectionKeepAlive=false;
        }
    }
    if(connectionClosePlace != -1)
    {
        isConnectionKeepAlive=false;
    }
    return isConnectionKeepAlive;
};

getCodeDescription = function(StatNum){
    switch (StatNum*1){
        case 200: return 'OK';
        case 404: return 'Not Found';
        case 500: return 'Internal Server Error';
        default : return StatNum.toString();
    }
}

parser.createResponse = function(socket){

    return {
        that : this,
        fields : [],
        set : function(field, value){
            if (value){
                this.fields[field] = value;

            }
            else{
                for (var f in field){
                    this.fields[f] = field[f];
                }
            }
        },
        get : function(getField){
            for (var field in this)
            {
                if (getField.toLowerCase() === field.toLowerCase())
                {
                    return this[field];
                }
            }
            return undefined;
        },
        status: function(stat){
            this.statusNumber = stat;
            return this;
        },
        statusNumber: undefined,
        cookie : function(name, value, options){
            if ((this.cookies === "")){
                this.cookies += 'Set-Cookie:';
            }

            this.cookies += ' ' + name + '='+JSON.stringify(value)+';';
            if(options)
            {
                for(var opt in options){
                    if (options.hasOwnProperty(opt))
                        this.cookies += ' ' + opt + '='+JSON.stringify(options[opt])+';';
                }
            }

        },
        cookies : "",
        json :function(BS, body){

            this.charset = this.charset || 'utf-8';
            if (!this.get('Content-Type'))
            {
                this.set('Content-Type','application/json');
            }
            if(!body){
                this.set('content-length',JSON.stringify(BS).length);
                return this.send(JSON.stringify(BS));
            }else{
                this.set('content-length',JSON.stringify(body).length);
                return this.send(BS,JSON.stringify(body));
            }

        },
        send : function(BS , body){
            var isNumber = function(val){
                return !isNaN(parseFloat(val)) && isFinite(val);
            }

            var response = 'HTTP/' + 1.1 +' ';
            var resBody = '';
            var StatNum;
            if (!body){

                if (isNumber(BS)){
                    StatNum = BS.toString();
                }
                else{
                    StatNum = this.statusNumber || '200';
                    resBody = BS;
                }
            }
            else{
                StatNum = BS.toString();
                resBody = body;

            }

            response += StatNum + ' ' + getCodeDescription(StatNum) + '\r\n';
            var fields=[];
            for (var p in this.fields) {
                if (this.fields.hasOwnProperty(p)) {
                    fields.push(p.toString() + ' : ' + this.fields[p].toString());
                }
            }
            response += fields.join('\r\n');
            if (!(this.cookies === "")){
            response+="\r\n" + this.cookies;
            }
            response +='\r\n\r\n';
            socket.write(response);
            socket.write(resBody,'binary');
            return true;
        }
    };
};

//the main server
var server  = net.createServer(function(socket) { //'connection' listener
    //set the socket to end if no new request for 2 sec
    socket.setTimeout(2000,function(){
        socket.end();
    })
    socket.on('error',function(err){
    })

    var req = socket;
    socket.on('data',function(data) {
        socket.setEncoding('utf8');
        socket.setTimeout(2000,function(){
            socket.end();
        })
        var shouldClose = parser.keepAlive(data.toString());
        try
        {
            var request = parser(data.toString());

            var response = parser.createResponse(socket);

           if(server.myServer != undefined){

                server.myServer.emit('income', request, response);
            }

        }
        catch (err)
        {
            if(err=="FileNotFound")
            {
                socket.write("HTTP/1.1 404 File Not Found Error \r\n" +
                    "Content-Type: text/html\r\n" +
                    "Content-Length: 81\r\n\r\n" +
                    "<html><head><title>ERROR</title></head><body>404 cant find the file</body></html>");
            }
            else if(err=="BadHTTP")
            {
                socket.write("HTTP/1.1 500 Internal Server Error \r\n" +
                    "Content-Type: text/html\r\n" +
                    "Content-Length: 84\r\n\r\n" +
                    "<html><head><title>ERROR</title></head><body>500 Internal Server Error</body></html>");
            }
            else if(err=="BadGet")
            {
                socket.write("HTTP/1.1 405 not GET request \r\n" +
                    "Content-Type: text/html\r\n" +
                    "Content-Length: 78\r\n\r\n" +
                    "<html><head><title>ERROR</title></head><body>405 NOT GET REQUEST</body></html>");
            }
            else
            {
                throw err;
            }
        }
        finally
        {
            if(shouldClose == false)
            {
                socket.end();
            }
        }

    });

});


//consturctor for server
module.exports.createServer  = function(handler){
    var eventEmitter = require('events').EventEmitter;


   var myServer = Object.create(eventEmitter.prototype);

    myServer.listen = function(port, callback)
        {
            server.listen(port, net.INADDR_ANY, 511, callback);
        };
    myServer.close = function(callback)
        {
            server.close(callback);
        };


    if (handler){
        myServer.on('income', handler)
        server.myServer = myServer;
    }

    return myServer;
};


