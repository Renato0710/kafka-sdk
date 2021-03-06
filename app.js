var Kafka = require('node-rdkafka');
var ProducerLoop = require('./producerLoop.js');
var fs = require('fs');

var opts = {};
var topicName = "Logs";
var runProducer = true;
var producer, admin;
var services;


// Running locally on development machine
console.log("Using command line arguments to find credentials.");

if (process.argv.length < 5) {
    console.log('ERROR: It appears the application is running is running without VCAP_SERVICES but the arguments are incorrect for local mode.');
    console.log('\nUsage:\n' +
        'node ' + process.argv[1] + ' <kafka_brokers_sasl> <api_key> <cert_location> [ -consumer | -producer ]\n');
    process.exit(-1);
}

opts.brokers = process.argv[2];
var apiKey = process.argv[3];
if (apiKey.indexOf(":") != -1) {
    var credentialArray = apiKey.split(":");
    opts.api_key = credentialArray[1];
} else {
    opts.api_key = apiKey;
}

// IBM Cloud/Ubuntu: '/etc/ssl/certs'
// Red Hat: '/etc/pki/tls/cert.pem',
// macOS: '/usr/local/etc/openssl/cert.pem' from openssl installed by brew
opts.calocation = process.argv[4];
if (!fs.existsSync(opts.calocation)) {
    console.error('Error - Failed to access <cert_location> : ' + opts.calocation);
    process.exit(-1);
}

console.log("Kafka Endpoints: " + opts.brokers);

if (!opts.hasOwnProperty('brokers') || !opts.hasOwnProperty('api_key') || !opts.hasOwnProperty('calocation')) {
    console.error('Error - Failed to retrieve options. Check that app is bound to an Event Streams service or that command line options are correct.');
    process.exit(-1);
}

// Shutdown hook
function shutdown(retcode) {
    if (admin) { // admin.isConnected() not present
        admin.disconnect();
    }

    if (producer && producer.isConnected()) {
        console.log("producer disconnecting")
        producer.disconnect(function (err, data) {
            console.log("producer disconnected")
        });
    }

    // Workaround for the rare case process(exit) may never be called
    // see https://github.com/Blizzard/node-rdkafka/issues/222
    setTimeout(function () {
        console.log("process kill");
        process.kill(process.pid, -9);
    }, 10000);
}

process.on('SIGTERM', function () {
    console.log('Shutdown received.');
    shutdown(0);
});
process.on('SIGINT', function () {
    console.log('Shutdown received.');
    shutdown(0);
});

// Config options common to all clients
var driver_options = {
    //'debug': 'all',
    'metadata.broker.list': opts.brokers,
    'security.protocol': 'sasl_ssl',
    'ssl.ca.location': opts.calocation,
    'sasl.mechanisms': 'PLAIN',
    'sasl.username': 'token',
    'sasl.password': opts.api_key,
    'broker.version.fallback': '0.10.0', // still needed with librdkafka 0.11.6 to avoid fallback to 0.9.0
    'log.connection.close': false,
    'api.version.request': true,
};

var admin_opts = {
    'client.id': 'kafka-admin',
};

// Add the common options to client and producer
for (var key in driver_options) {
    admin_opts[key] = driver_options[key];
}

// Use the AdminClient API to create the topic
// with 1 partition and a retention period of 24 hours.
console.log('Creating the topic ' + topicName + ' with AdminClient');
admin = Kafka.AdminClient.create(admin_opts);
admin.connect();
console.log("AdminClient connected");
admin.createTopic({
        topic: topicName,
        num_partitions: 1,
        replication_factor: 3,
        config: {
            'retention.ms': (24 * 60 * 60 * 1000).toString()
        }
    },
    function (err) {
        if (err) {
            console.log(err);
        } else {
            console.log('Topic ' + topicName + ' created');
        }

        // carry on if topic created or topic already exists (code 36)
        if (!err || err.code == 36) {
            runLoops();
            console.log("This sample app will run until interrupted.");
            admin.disconnect();
        } else {
            shutdown(-1);
        }
    }
);

// Build and start the producer
function runLoops() {
    var producer_opts = {
        'client.id': 'kafka-nodejs-console-sample-producer',
        'dr_msg_cb': true // Enable delivery reports with message payload
    };

    // Add the common options to client and producer
    for (var key in driver_options) {
        producer_opts[key] = driver_options[key];
    }

    if (runProducer) {
        producer = ProducerLoop.buildProducer(Kafka, producer_opts, topicName, shutdown);
        producer.connect();
    }
};
