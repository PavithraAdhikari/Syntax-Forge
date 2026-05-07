const { exec } = require("child_process");
const path = require("path");

function executeCPP(filepath){

    return new Promise((resolve,reject)=>{

        const jobId = path.basename(filepath).split(".")[0];
        const outputPath = `outputs/${jobId}.exe`;

        const command = `g++ ${filepath} -o ${outputPath} && ${outputPath}`;

        exec(command,(error,stdout,stderr)=>{

            if(error) return reject(stderr || error.message);

            resolve(stdout || "Program executed but no output");
        });

    });
}

module.exports = executeCPP;