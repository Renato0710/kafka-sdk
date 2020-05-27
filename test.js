const path = require('path');
const fs = require("fs");
const directoryPath = path.join(__dirname, 'logs');

function sendMessages(counter, topic, partition) {

    fs.readdir(directoryPath, function (err, files) {
        //handling error
        if (err) {
            return console.log('Unable to scan directory: ' + err);
        }
        if (files.length != 0) {
            var timeout = 600000
            //listing all files using forEach
            files.forEach(function (file) {
                var logs = fs.readFileSync(`${directoryPath}/${file}`);
                logs = JSON.parse(logs);
                if (logs.length != 0) {
                    logs.forEach(log => {
                        var message = new Buffer(JSON.stringify(log));
                        var key = 'Key' + counter;
                        console.log(log);
                    });
                }
                fs.unlink(`${directoryPath}/${file}`, function (err) {
                    if (err) throw err;
                    // if no error, file has been deleted successfully
                    console.log(`File ${file} deleted!`);
                });
            });
        }
        setTimeout(function () {
            sendMessages();
        }, timeout);
    });
}

sendMessages();