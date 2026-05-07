/* const { exec } = require("child_process");
const fs = require("fs");

function executeJava(code) {

    return new Promise((resolve, reject) => {

        const file = `codes/Main.java`;

        fs.writeFileSync(file, code);

        exec(`javac ${file} && java -cp codes Main`, (error, stdout, stderr) => {

            if (error) return reject(stderr);
            if (stderr) return reject(stderr);

            resolve(stdout);

        });

    });

}

module.exports = { executeJava };*/

const { exec } = require("child_process");

function executeJava(filepath) {

    return new Promise((resolve, reject) => {

        exec(`javac ${filepath} && java -cp codes Main`, (error, stdout, stderr) => {

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

module.exports = executeJava;