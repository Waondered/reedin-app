import express from "express"
import { createServer } from "http"
import { Server } from "socket.io"
import multer from "multer"
import cors from "cors"
import "dotenv/config"

import { dbConnection } from "./database.js"

const PORT = 3000;
const ADMIN = "Admin"

const storageFiles = multer.memoryStorage();
const uploadFiles = multer({storage: storageFiles});

const app = express()
const expressServer = createServer(app)
app.use(express.json())
app.use(express.urlencoded({extended: false}))
app.use(express.static("public"));
app.use(cors());
app.set ("view engine", "ejs")

const io = new Server(expressServer, {
  cors: {
    origin: process.env.NODE_ENV === "production" ? false : 
    ["http://localhost:5500", "http://127.0.0.1:5500"]
  }
})

io.on('connection', socket =>{
  console.log(`${socket.id} conectado`)
  socket.emit('message', buildMsg(ADMIN, "Bem vindo(a) ao chat!"))

  socket.on('enterRoom', ({ name, room}) =>{
    const prevRoom = getUser (socket.id)?.room 
    if (prevRoom){
      socket.leave (prevRoom)
      io.to(prevRoom).emit('message', buildMsg(ADMIN, `${name} saiu`))
    }

    const user = activateUser (socket.id, name, room)

    if (prevRoom) {
      io.to(prevRoom).emit('userList', {
        users: getUsersInRoom(prevRoom)
      })
    }
    socket.join (user.room)
    socket.emit("message", buildMsg (ADMIN, `Você entrou no grupo ${user.room}`))

    socket.broadcast.to(user.room).emit('message', buildMsg(ADMIN, `${user.name} entrou no grupo`))

    io.to(user.room).emit('userList', {
      users: getUsersInRoom(user.room)
    })

    io.emit('roomList', {
      rooms: getAllActiveRooms()
    })
  })
  

  socket.on('message', ({ name, text}) => {
    const room = getUser(socket.id)?.room
    if(room) {
      io.to(room).emit('message', buildMsg(name, text))
    }
      })

  socket.on("disconnect", () =>{
    const user = getUser(socket.id)
    userLeavesApp(socket.id)
    
    if(user) {
      io.to(user.room).emit('message', buildMsg(ADMIN, `${user.name} saiu`))
      io.to(user.room).emit('userList', {
        users: getUsersInRoom(user.room)
      })

      io.emit('roomList', {
        rooms: getAllActiveRooms()
      })
    }

  })

  socket.on("activity", (name) =>{
    const room = getUser(socket.id)?.room
    if (room){
      socket.broadcast.to(room).emit('activity', name)
    }
  })
})

expressServer.listen(PORT, (err) =>{
  if (err) console.log("Erro ao iniciar o servidor")
  console.log(`Servidor iniciado no port ${PORT}`)
})

const UsersState = {
  users: [],
  setUsers: function(newUsersArray){
    this.users = newUsersArray
    }
}

function buildMsg(name, text){
  return {
    name,
    text,
    time: new Intl.DateTimeFormat('default', {
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric'
    }).format (new Date ())
  }
}

function activateUser(id, name, room){
  const user = { id, name, room }
  UsersState.setUsers([
    ...UsersState.users.filter(user => user.id !== id),
    user 
  ])
  return user
}

function userLeavesApp (id){
  UsersState.setUsers(
    UsersState.users.filter(user => user.id !== id)
  )
}

function getUser(id){
  return UsersState.users.find(user => user.id === id)
}

function getUsersInRoom (room){
  return UsersState.users.filter(user => user.room === room)
}

function getAllActiveRooms(){
  return Array.from(new Set(UsersState.users.map(user => user.room)))
}


app.post("/upload", uploadFiles.single("file"), (req, res) => {
  const fileData = req.file;
  const { title, author, publisher, pages } = req.body;

  if (!fileData){
  return res.status(400).json("Arquivo não enviado")
  }

  const sqlForm = "INSERT INTO formulario (title, author, publisher, pages) VALUES (?, ?, ?, ?)";

  dbConnection.query(sqlForm, [title, author, publisher, pages], (err, result) => {
    if(err){
      console.error(err)
      return res.status(500).json({error: "Erro ao inserir dados na tabela forms"})
    }

    const formId = result.insertId

    const sqlArquivo = "INSERT INTO arquivo (form_id, filename, file_data) VALUES (?, ?, ?)"
    dbConnection.query(sqlArquivo, [formId, fileData.originalname, fileData.buffer], (err2) =>{
      if (err2){
      console.error(err2);
      return res.status(500).json({error: "Erro ao inserir arquivo na tabela arquivos"})
    }

    res.status(200).json({message: "Dados salvos"})
    })
  })
})


app.get("/arquivos", (req, res) => {
  const arquivoSQL = `
  SELECT formulario.id, title, author, publisher, pages, arquivo.filename as  arquivo 
  FROM formulario
  INNER JOIN arquivo ON formulario.id = arquivo.form_id
  `;

  dbConnection.query(arquivoSQL, (err, results) => {
    if (err){
      console.error(err);
      return res.status(500).json("Erro ao buscar arquivo")
    }

    res.json({ livros: results})
  })
})


app.get("/download/:id", (req, res) =>{ // 
 const {id} = req.params;

 const filedataSql = "SELECT filename, file_data FROM arquivo WHERE form_id = ? LIMIT 1"
 dbConnection.query(filedataSql, [id], (err, results) =>{
   if (err){
      console.error(err)
  return res.status(500).send("Erro ao buscar dados do arquivo")
  }
if (results.length === 0) {
 return res.status(404).send("Arquivo não encontrado")
 }

 const arquivo = results[0]

 res.setHeader("Content-Disposition",`attachment; filename="${arquivo.filename}"`) 
 res.setHeader("Content-Type", "application/octet-stream")
 res.send(arquivo.file_data)

})
})

app.delete("/arquivo/:id", (req, res) =>{
  const { id } = req.params;

  const deleteArquivo = "DELETE FROM arquivo WHERE form_id = ?"
  const deleteForm = "DELETE FROM formulario WHERE id = ?"

  dbConnection.query(deleteArquivo, [id], (err) =>{
    if (err){
      console.error(err);
      return res.status(500).send("Erro ao excluir arquivo")
    }

    dbConnection.query(deleteForm, [id], (err2) =>{
      if(err2) {
        console.error(err2)
        return res.status(500).send("Erro ao excluir form")
      }
      
      res.status(200).send("Arquivo excluído")
    })
  })
})

app.get("/", (req, res) => {
  res.render("index")
})

app.get("/library", (req, res) => {
  res.render("library")
})

app.get("/community", (req, res) => {
  res.render("community")
})



