const express = require('express')
const app = express();
const port = 3000
const fs = require("fs").promises;
const bodyParser = require("body-parser");
const path = require("path");
const { readFile } = require('fs');
//const filePath = "dati.json";

const rottaPublic = path.join(__dirname, "public");
const rottaDati = path.join(__dirname,"public","asset", "dati.json");

app.set("view engine", "pug");
app.set("views", "./views");


async function read() {
    try {
        const datiJson = await fs.readFile(path.join(rottaDati), "utf-8");
        return JSON.parse(datiJson);
    } catch (error) {
      if (error.code === "ENOENT") {
        console.error("Il file non esiste. Creando un nuovo file vuoto.");
        await fs.writeFile(path.join(rottaDati), JSON.stringify([], null, 2), "utf-8");
        return [];
      } else {
        console.error("Errore durante la lettura del file:", error);
        // Non sovrascrivere il file in caso di altri errori
        return [];
      }
    }
  }

  async function write(datiJson) {
    try {
        await fs.writeFile(path.join(rottaDati), JSON.stringify(datiJson, null, 2), 'utf-8');
    } catch (error) {
        console.error("Errore durante la scrittura del file:", error);
    }
}

  
  function save(dati) {
    write(dati);
  }


//sezione midleware
app.use(bodyParser.urlencoded({extended: true}));
app.use(express.static(rottaPublic)); //server per far fuznionare i file statici

app.use(async (req, res, next) => {
    try {
       const dati = await read();
       // Utilizza 'dati' come necessario, ad esempio passandolo al prossimo middleware o impostandolo come variabile di richiesta
       req.dati = dati; // salvo i dati per passarli al midleware successivo
       //console.log("dati letti:"+dati)
       //console.log(req.dati);
       next();
    } catch (error) {
       console.error("Errore durante la lettura dei dati:", error);
       next(error); // Passa l'errore al gestore degli errori di Express
    }
   });


app.get("/", (req,res)=>{
    res.render("index");
});

app.get("/formVotazioni",(req,res)=>{
    let candidati = req.dati;
    //console.log(candidati);
    res.render("form", { candidati });
});

app.post("/inserisciDati",(req,res)=>{
    const { nome, cognome, email, nomecandidato } = req.body;
    console.log(nomecandidato);
    const candidati = req.dati;
    let candidato = candidati.find(candidato=>candidato.nomeCandidato === nomecandidato); //modifica questo controllo per fare in modo che solo una email alla volta puo votare un unico candidato
    
    // Aggiungi un controllo per assicurarti che candidato non sia undefined
    if (!candidato) {
        res.send("Candidato non trovato.");
        return;
    }
    
    const votanti = candidato.votanti || [];
    const votoPassato = votanti.find(votante => votante.emailVotante === email);
    if (votoPassato) {
        res.send("Hai già votato!");
        return;
    } else {
       // Controllo se l'utente ha già votato per un altro candidato
       const votanteGiaVotato = candidati.some(candidato => {
        const votantiCandidato = candidato.votanti || [];
        return votantiCandidato.some(votante => votante.emailVotante === email);
        });

        if (votanteGiaVotato) {
          res.send("Hai già votato per un altro candidato.");
          return;
        }
        votanti.push({ nomeVotante: nome, cognomeVotante: cognome, emailVotante: email });
        candidato.votanti = votanti;
        candidato.voti++;
        save(candidati);
        const messaggio = `Il candidato ${candidato.nomeCandidato} ha attualmente ${candidato.voti} voti.`;
        res.render("form", { candidati, messaggio });
    }
});

app.get("/votazioni",(req,res)=>{
  const candidati = req.dati;
  let copiacandidati = candidati.sort((a, b) => b.voti - a.voti); //per farlo in ordine crescente besta invertire l'ordine di a e b
  res.render("lista", {copiacandidati});
});




app.listen(port, () => console.log(`Server avviato su http://localhost:${port}`))
