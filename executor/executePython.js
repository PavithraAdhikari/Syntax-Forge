const { exec } = require("child_process");

function executePython(filepath) {
    return new Promise((resolve, reject) => {
        exec(`python ${filepath}`, (error, stdout, stderr) => {
            if (error) {
                reject(stderr);
            }
            resolve(stdout);
        });
    });
}

module.exports = executePython;