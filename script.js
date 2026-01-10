let selectedPlayer = null;
let currentSelectedPlayer = new Array();
let stackPlayersSquad1 = new Array(1, 2, 3, 4, 5, 66);
let stackPlayersSquad2 = new Array(7, 8, 9, 10, 11, 12);
let servePlayerSquad1 = document.getElementsByClassName("serve")[0];
let servePlayerSquad2 = document.getElementsByClassName("serve")[1];
let score1 = 0;
let score2 = 0;
let playerToServe = 1;
let playerToServeTemp = null;
let timeoutSquad1 = 3;
let timeoutSquad2 = 3;
let counterPlayerTouched = 0;
let buttonsAttack = document.querySelectorAll(".attack");
let buttonsServe = document.querySelectorAll(".serve");
let buttonsDefence = document.querySelectorAll(".defence");
let buttonsBlock = document.querySelectorAll(".block");
let buttonsFwb = document.querySelectorAll(".fwb");
let buttonsCards = document.querySelectorAll(".cards");
let buttonsTechnical = document.querySelectorAll(".technical");
let playersSquad1 = document.querySelectorAll(".left .player");
let playersSquad2 = document.querySelectorAll(".right .player");
let isYellow = false;
let isRed = false;
let isChange = false;

let json = {
  squad1: "Terraglio",
  squad2: "Mirano",
  date: "20-01-26:20:30",
  place: "Palestra Terraglio",
  numberDay: 23,
  firstPlayerSquad1: {
    player1: {
      name: "Mario",
      surname: "Rossi",
      number: 10,
    },
    player2: {
      name: "Francesco",
      surname: "Bruno",
      number: 5,
    },
    player3: {
      name: "Michele",
      surname: "Micheletto",
      number: 8,
    },
    player4: {
      name: "Micheal",
      surname: "Jordan",
      number: 4,
    },
    player5: {
      name: "Alberto",
      surname: "Tomba",
      number: 7,
    },
    player6: {
      name: "Sofia",
      surname: "Goggia",
      number: 20,
    },
  },
  benchPlayerSquad1: {
    player1: {
      name: "Mario",
      surname: "Rossi",
      number: 10,
    },
    player2: {
      name: "Francesco",
      surname: "Bruno",
      number: 5,
    },
    player3: {
      name: "Michele",
      surname: "Micheletto",
      number: 8,
    },
  },
  firstPlayerSquad2: {
    player1: {
      name: "Mario",
      surname: "Rossi",
      number: "10",
    },
    player2: {
      name: "Francesco",
      surname: "Bruno",
      number: 5,
    },
    player3: {
      name: "Michele",
      surname: "Micheletto",
      number: 8,
    },
    player4: {
      name: "Micheal",
      surname: "Jordan",
      number: 4,
    },
    player5: {
      name: "Alberto",
      surname: "Tomba",
      number: 7,
    },
    player6: {
      name: "Sofia",
      surname: "Goggia",
      number: "20",
    },
  },
  benchPlayerSquad2: {
    player1: {
      name: "Mario",
      surname: "Rossi",
      number: "10",
    },
    player2: {
      name: "Francesco",
      surname: "Bruno",
      number: 5,
    },
    player3: {
      name: "Michele",
      surname: "Micheletto",
      number: 8,
    },
  },
  setWonSquad1: "0",
  setWonSquad2: "0",
  sets: {
    set1: { pointWonSquad1: 0, pointWonSquad2: 0, events: [] },
    set2: { pointWonSquad1: 0, pointWonSquad2: 0, events: [] },
    set3: { pointWonSquad1: 0, pointWonSquad2: 0, events: [] },
    set4: { pointWonSquad1: 0, pointWonSquad2: 0, events: [] },
    set5: { pointWonSquad1: 0, pointWonSquad2: 0, events: [] },
  },
};

function updateScore() {
  document.querySelector(".score").textContent = score1 + " - " + score2;
}

function highlightPlayer(p) {
  console.log(p);
  p.classList.add("selected");
  selectedPlayer = p;
}

function rotate(s, squad) {
  let pos = [5, 3, 1, 2, 4, 6];
  console.log(s);
  let first = s[0];
  s.shift();
  s.push(first);
  console.log(s);
  console.log("." + squad + ".player");
  const divs = document.querySelectorAll("." + squad + " .player"); // supponendo div all'interno di .grid

  // Estrazione dei valori numerici
  let values = Array.from(divs, (d) => parseInt(d.textContent));

  // Creiamo un array vuoto per i nuovi valori
  let newValues = [];

  // Assegniamo i valori secondo il nuovo ordine desiderato
  newValues[0] = values[2]; // Div0 <- 3
  newValues[1] = values[0]; // Div1 <- 1
  newValues[2] = values[4]; // Div2 <- 5
  newValues[3] = values[1]; // Div3 <- 2
  newValues[4] = values[5]; // Div4 <- 6
  newValues[5] = values[3]; // Div5 <- 4

  // Aggiorniamo i div con i nuovi valori
  divs.forEach((div, i) => (div.textContent = newValues[i]));
}

document.addEventListener("DOMContentLoaded", () => {
  const players = document.querySelectorAll(".player");
  for (let i = 0; i < playersSquad1.length; i++) {
    playersSquad1[i].innerText = stackPlayersSquad1.at(i);
  }

  for (let i = 0; i < playersSquad2.length; i++) {
    playersSquad2[i].innerText = stackPlayersSquad2.at(i);
  }

  //disabilito i pulsanti che non servono
  buttonsAttack.forEach((p1) => (p1.disabled = true));
  buttonsDefence.forEach((p1) => (p1.disabled = true));
  buttonsBlock.forEach((p1) => (p1.disabled = true));
  buttonsFwb.forEach((p1) => (p1.disabled = true));

  console.log(stackPlayersSquad1.at(0));

  if (playerToServe === 1) {
    //serve squadra di sx
    currentSelectedPlayer.push(servePlayerSquad1.innerText);
    highlightPlayer(servePlayerSquad1);

    playersSquad1.forEach((p1) => {
      if (!p1.classList.contains("serve")) {
        p1.style.pointerEvents = "none";
      }
    });
  } else {
    //serve squadra di dx
    currentSelectedPlayer.push(servePlayerSquad2.innerText);
    highlightPlayer(servePlayerSquad2);

    playersSquad2.forEach((p1) => {
      if (!p1.classList.contains("serve")) {
        p1.style.pointerEvents = "none";
      }
    });
  }

  //inizializzo i timeout
  timeoutButtons = document.querySelectorAll(".timeout");
  timeoutButtons[0].innerHTML += timeoutSquad1;
  timeoutButtons[1].innerHTML += timeoutSquad2;

  players.forEach((p) => {
    p.addEventListener("click", () => {
      players.forEach((pl) => pl.classList.remove("selected"));
      counterPlayerTouched++;

      if (counterPlayerTouched != 0) {
        buttonsAttack.forEach((p1) => (p1.disabled = false));
        buttonsDefence.forEach((p1) => (p1.disabled = false));
        buttonsBlock.forEach((p1) => (p1.disabled = false));
        buttonsFwb.forEach((p1) => (p1.disabled = false));
        buttonsTechnical.forEach((p1) => (p1.disabled = true));
        buttonsCards.forEach((p1) => (p1.disabled = true));
      }

      playersSquad1.forEach((p1) => {
        if (!p1.classList.contains("serve")) {
          p1.style.pointerEvents = "auto";
        }
      });

      playersSquad2.forEach((p1) => {
        if (!p1.classList.contains("serve")) {
          p1.style.pointerEvents = "auto";
        }
      });

      console.log("test" + isYellow);
      if (isYellow) {
        console.log("cartellino giallo");
        //riattivo tutti i player

        playersSquad1.forEach((p1) => {
          p1.style.pointerEvents = "auto";
        });

        playersSquad2.forEach((p1) => {
          p1.style.pointerEvents = "auto";
        });

        //inserisco nel json

        //ripristino com'era prima
        //disabilito i giocatori in battuta
        if (playerToServe === 1) {
          //serve squadra di sx
          currentSelectedPlayer.push(servePlayerSquad1.innerText);
          highlightPlayer(servePlayerSquad1);

          playersSquad1.forEach((p1) => {
            if (!p1.classList.contains("serve")) {
              p1.style.pointerEvents = "none";
            }
          });
        } else {
          //serve squadra di dx
          currentSelectedPlayer.push(servePlayerSquad2.innerText);
          highlightPlayer(servePlayerSquad2);

          playersSquad2.forEach((p1) => {
            if (!p1.classList.contains("serve")) {
              p1.style.pointerEvents = "none";
            }
          });
        }

        isYellow = false;
      } else if (isRed) {
        console.log("cartellino rosso");
      }

      highlightPlayer(p);
      selectedPlayer = p;
      currentSelectedPlayer.push(p.innerHTML);
    });
  });

  document.querySelectorAll(".events button").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (!selectedPlayer) {
        alert("Seleziona prima un giocatore");
        return;
      }

      const isLeftButton = btn.closest(".panel").classList.contains("left");

      console.log(isLeftButton);

      const isLeftTeam = selectedPlayer
        .closest(".half")
        .classList.contains("left");
      const label = btn.textContent.toLowerCase();

      playerToServeTemp = playerToServe;
      players.forEach((pl) => pl.classList.remove("selected"));
      if (label === "point") {
        //decido di chi è il punto
        if (isLeftTeam) {
          score1++;
          console.log(playerToServe);
          console.log(isLeftButton);
          //decido se la squadra deve fare giro
          if (playerToServe === 2 && isLeftButton) {
            rotate(stackPlayersSquad1, "left");
          }
          highlightPlayer(servePlayerSquad1);
          playerToServe = 1;
        } else {
          score2++;
          if (playerToServe === 1 && !isLeftButton) {
            rotate(stackPlayersSquad2, "right");
          }
          highlightPlayer(servePlayerSquad2);
          playerToServe = 2;
        }

        //json

        json.sets.set1.events.push({
          events1: {
            typeEvent: "point",
            squadToSet: playerToServeTemp,
            playerToSet: selectedPlayer.innerHTML, //player who makes the serve
            touchOfPlayers: currentSelectedPlayer,
            squadWhoWinPoint: playerToServe, //Squadra A --> 1 e Squadra B --> 2
            pointMode: "point", //point or out
            isAce: false, //true or false
          },
        });

        console.log(JSON.stringify(json, null, 2));
      } else if (label === "out") {
        //decido di chi è il punto
        if (isLeftTeam) {
          score2++;
          console.log(playerToServe);
          console.log(isLeftButton);

          if (playerToServe === 1 && isLeftButton) {
            rotate(stackPlayersSquad2, "right");
          }
          highlightPlayer(servePlayerSquad2);
          playerToServe = 2;
        } else {
          score1++;
          //decido se la squadra deve fare giro
          if (playerToServe === 2 && !isLeftButton) {
            rotate(stackPlayersSquad1, "left");
          }
          highlightPlayer(servePlayerSquad1);
          playerToServe = 1;
        }
      } else if (label === "ace") {
        if (isLeftTeam) {
          score1++;
          highlightPlayer(servePlayerSquad1);
        } else {
          score2++;
          highlightPlayer(servePlayerSquad2);
        }
      } else if (label === "errore") {
        if (isLeftTeam) {
          score2++;
          rotate(stackPlayersSquad2, "right");
          highlightPlayer(servePlayerSquad2);
        } else {
          score1++;
          rotate(stackPlayersSquad2, "left");
          highlightPlayer(servePlayerSquad1);
        }
      } else if (label === "lost ball") {
        if (isLeftTeam) {
          score2++;
          console.log(playerToServe);
          console.log(isLeftButton);

          if (playerToServe === 1 && isLeftButton) {
            rotate(stackPlayersSquad2, "right");
          }
          highlightPlayer(servePlayerSquad2);
          playerToServe = 2;
        } else {
          score1++;
          //decido se la squadra deve fare giro
          if (playerToServe === 2 && !isLeftButton) {
            rotate(stackPlayersSquad1, "left");
          }
          highlightPlayer(servePlayerSquad1);
          playerToServe = 1;
        }
      } else if (label === "double") {
        if (isLeftTeam) {
          score2++;
          console.log(playerToServe);
          console.log(isLeftButton);

          if (playerToServe === 1 && isLeftButton) {
            rotate(stackPlayersSquad2, "right");
          }
          highlightPlayer(servePlayerSquad2);
          playerToServe = 2;
        } else {
          score1++;
          //decido se la squadra deve fare giro
          if (playerToServe === 2 && !isLeftButton) {
            rotate(stackPlayersSquad1, "left");
          }
          highlightPlayer(servePlayerSquad1);
          playerToServe = 1;
        }
      } else if (label === "4 touches") {
        if (isLeftTeam) {
          score2++;
          console.log(playerToServe);
          console.log(isLeftButton);

          if (playerToServe === 1 && isLeftButton) {
            rotate(stackPlayersSquad2, "right");
          }
          highlightPlayer(servePlayerSquad2);
          playerToServe = 2;
        } else {
          score1++;
          //decido se la squadra deve fare giro
          if (playerToServe === 2 && !isLeftButton) {
            rotate(stackPlayersSquad1, "left");
          }
          highlightPlayer(servePlayerSquad1);
          playerToServe = 1;
        }
      } else if (label === "raised") {
        if (isLeftTeam) {
          score2++;
          console.log(playerToServe);
          console.log(isLeftButton);

          if (playerToServe === 1 && isLeftButton) {
            rotate(stackPlayersSquad2, "right");
          }
          highlightPlayer(servePlayerSquad2);
          playerToServe = 2;
        } else {
          score1++;
          //decido se la squadra deve fare giro
          if (playerToServe === 2 && !isLeftButton) {
            rotate(stackPlayersSquad1, "left");
          }
          highlightPlayer(servePlayerSquad1);
          playerToServe = 1;
        }
      } else if (label === "position") {
      } else if (label === "invasion") {
        if (isLeftTeam) {
          score2++;
          console.log(playerToServe);
          console.log(isLeftButton);

          if (playerToServe === 1 && isLeftButton) {
            rotate(stackPlayersSquad2, "right");
          }
          highlightPlayer(servePlayerSquad2);
          playerToServe = 2;
        } else {
          score1++;
          //decido se la squadra deve fare giro
          if (playerToServe === 2 && !isLeftButton) {
            rotate(stackPlayersSquad1, "left");
          }
          highlightPlayer(servePlayerSquad1);
          playerToServe = 1;
        }
      } else if (label === "yellow") {
        isYellow = true;
      } else if (label === "red") {
        isRed = true;
      } else if (label === "change") {
      }

      //quando premi sui pulsanti di cards e techinical bisogna riattivare TUTTI i membri delle squadre e, solo dopo, ripristinare il tutto

      //determino a quale squadra spetta battere
      currentSelectedPlayer = new Array();
      updateScore();

      //disabilito i giocatori prima della battuta
      if (playerToServe === 1) {
        //serve squadra di sx
        currentSelectedPlayer.push(servePlayerSquad1.innerText);
        highlightPlayer(servePlayerSquad1);

        playersSquad1.forEach((p1) => {
          if (!p1.classList.contains("serve")) {
            p1.style.pointerEvents = "none";
          }
        });
      } else {
        //serve squadra di dx
        currentSelectedPlayer.push(servePlayerSquad2.innerText);
        highlightPlayer(servePlayerSquad2);

        playersSquad2.forEach((p1) => {
          if (!p1.classList.contains("serve")) {
            p1.style.pointerEvents = "none";
          }
        });
      }

      //ripristino i pulsanti che servono
      buttonsTechnical.forEach((p1) => (p1.disabled = false));
      buttonsCards.forEach((p1) => (p1.disabled = false));

      //disabilito i pulsanti che non servono
      buttonsAttack.forEach((p1) => (p1.disabled = true));
      buttonsDefence.forEach((p1) => (p1.disabled = true));
      buttonsBlock.forEach((p1) => (p1.disabled = true));
      buttonsFwb.forEach((p1) => (p1.disabled = true));
    });
  });
});
