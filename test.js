const path = require('path');
const fs = require("fs");
const directoryPath = path.join(__dirname, 'logs');

function sendMessages() {

    fs.readdir(directoryPath, function (err, files) {
        //handling error
        if (err) {
            return console.log('Unable to scan directory: ' + err);
        }
        if (files.length != 0) {
            var timeout = 600000
            //listing all files using forEach
            files.forEach(function (file) {
                // Do whatever you want to do with the file
                var logs = fs.readFileSync(`${directoryPath}/${file}`);
                logs = JSON.parse(logs);
                logs.forEach(log => {
                    var message = new Buffer(JSON.stringify(log));
                    console.log(log)
                    // Short sleep for flow control in this sample app
                    // to make the output easily understandable
                });
                fs.unlinkSync(`${directoryPath}/${file}`)
            });
        }
        setTimeout(function () {
            sendMessages();
        }, timeout);
    });
}

sendMessages();