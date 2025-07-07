const addLibrary = document.querySelector("#open-modal");
const closeModal = document.querySelector("#close-modal");
const modal = document.querySelector("#modal");
const fade = document.querySelector("#fade");
const form = document.querySelector("form");
const dragdrop = document.querySelector(".dragndrop");
const fileInput = dragdrop ? dragdrop.querySelector(".file-input") : null;

const toggleModal = () => {
   modal.classList.toggle("hide")
   fade.classList.toggle("hide")
}

[addLibrary, closeModal, fade].forEach((e) => {
  if(e) {
    e.addEventListener("click", () => toggleModal());
  }
});

     let file;

     if (dragdrop && fileInput){
      dragdrop.addEventListener("click", ()=>{
        fileInput.click();
     })
     }

     fileInput.onchange = (e) => {
        file = e.target.files[0];
     }
     
    function CarregarArquivos() {
  fetch("http://localhost:3000/arquivos")
    .then(res => res.json())
    .then(data => {
      const listasAntigas = document.querySelectorAll("ul");
      listasAntigas.forEach(ul => ul.remove());

      const ul = document.createElement("ul");

      data.livros.forEach(livro => {
        const li = document.createElement("li");
        li.innerHTML = `
          <strong> Título: </strong> ${livro.title} <br>
          <strong> Autor: </strong> ${livro.author} <br>
          <strong> Editora: </strong> ${livro.publisher} <br>
          <strong> Número de páginas: </strong> ${livro.pages} <br>
          <strong><a id="download" href="http://localhost:3000/download/${livro.id}" download="${livro.arquivo}" target="_blank">Download</a></strong><br>
          <button class="delete" data-id="${livro.id}">Excluir</button>
        `;
        ul.appendChild(li);
      });

      const biblioteca = document.getElementById("biblioteca");
      biblioteca.appendChild(ul);
      biblioteca.appendChild(addLibrary); 

      ul.querySelectorAll(".delete").forEach(button => {
        button.addEventListener("click", () => {
          const id = button.getAttribute("data-id");

          if (confirm("Deseja realmente excluir este arquivo?")) {
            fetch(`http://localhost:3000/arquivo/${id}`, {
              method: "DELETE"
            })
              .then(res => {
                if (res.ok) {
                  CarregarArquivos();
                } else {
                  alert("Erro ao excluir o arquivo");
                }
              })
              .catch(err => console.error(err));
          }
        });
      });
    });
}

     form.addEventListener('submit', (e) => {
        e.preventDefault();
        const title = document.getElementById("title")
        const author = document.getElementById("author")
        const publisher = document.getElementById("publisher")
        const pages = document.getElementById("pages")

        const formData = new FormData ();
        formData.append("title", title.value)
        formData.append("author", author.value)
        formData.append("publisher", publisher.value)
        formData.append("pages", pages.value)

        if(file){
        formData.append("file", file)
     }

     console.log(...formData)

     fetch("http://localhost:3000/upload", {
        method: "POST",
        body: formData
     })
    .then(res => res.json())
    .then(data =>{
     CarregarArquivos();
     toggleModal();
     form.reset();
     file = null;
     })
    
    .catch(err =>{
        console.log(err);
    })
});
    
 CarregarArquivos();