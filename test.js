const path = require('path');
const fs = require("fs");
const directoryPath = path.join(__dirname, 'logs');

function sendMessages(counter, topic, partition) {
    var timeout = 6000
    fs.readdir(directoryPath, function (err, files) {
        //handling error
        if (err) {
            return console.log('Unable to scan directory: ' + err);
        }
        console.log(files);
        if (files.length != 0) {
            //listing all files using forEach
            files.forEach(function (file) {
                var logs = fs.readFileSync(`${directoryPath}/${file}`);
                if (!isEmpty(logs)) {
                    logs = JSON.parse(logs);
                    logs.forEach(log => {
                        console.log(log);
                    });
                    fs.unlink(`${directoryPath}/${file}`, function (err) {
                        if (err) throw err;
                        // if no error, file has been deleted successfully
                        console.log(`File ${file} deleted!`);
                    });
                }
            });
        }
        setTimeout(function () {
            sendMessages();
        }, timeout);
    });
}

function isEmpty(obj) {
    for (var key in obj) {
        if (obj.hasOwnProperty(key))
            return false;
    }
    return true;
}

sendMessages();