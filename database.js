import mysql from "mysql2";
import 'dotenv/config'

const dbConnection = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
})

dbConnection.connect(function (err){
    if(!err){
        console.log("Conectado ao banco de dados MySQL")
    }
    else {
        console.error("Erro ao conectar: " + err.stack)
    }
})

export  { dbConnection };