const { exec } = require("child_process");

function executeJS(filepath) {

    return new Promise((resolve, reject) => {

        exec(`node ${filepath}`, (error, stdout, stderr) => {

            if (error) {
                return reject(stderr || error.message);
            }

            if (stderr) {
                return reject(stderr);
            }

            resolve(stdout);

        });

    });

}

module.exports = executeJS;