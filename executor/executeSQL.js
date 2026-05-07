const { exec } = require("child_process");

function executeSQL(filepath){

    return new Promise((resolve,reject)=>{

        exec(`sqlite3 :memory: < ${filepath}`,(error,stdout,stderr)=>{

            if(error) return reject(stderr || error.message);

            resolve(stdout || "Query executed");
        });

    });
}

module.exports = executeSQL;