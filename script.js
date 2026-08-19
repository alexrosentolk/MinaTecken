const API_URL =
  "https://script.google.com/macros/s/AKfycbxM_jf0CaNpkLk2OKBafxnqbvDms8lYZhEW-n5DityRLKTi8c8xNN8tNV5rpYvdXF8vNw/exec";

const app = document.getElementById("app");

let currentUser =
  localStorage.getItem("minaTeckenUser") || "";

let allSigns = [];

let quizSigns = [];
let quizIndex = 0;
let quizAnswerMode = "";
let quizQuestionMode = "";

let editingRowId = null;
let editMode = false;


/* =========================
   GRUND
========================= */

const clone = id =>
  document
    .getElementById(id)
    .content
    .cloneNode(true);


function escapeHtml(value){

  return String(value ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");

}


function shuffle(array){

  for(
    let i=array.length-1;
    i>0;
    i--
  ){

    const j=Math.floor(
      Math.random()*(i+1)
    );

    [
      array[i],
      array[j]
    ]=[
      array[j],
      array[i]
    ];

  }

  return array;
}


/* =========================
   LOGIN
========================= */

function showLogin(){

  document.getElementById("nav")
    .style.display="none";

  document.getElementById("userArea")
    .innerHTML="";

  app.replaceChildren(
    clone("loginTemplate")
  );

  document.getElementById("loginForm")
    .onsubmit=handleLogin;

}


async function handleLogin(event){

  event.preventDefault();

  const input =
    document.getElementById("username");

  const errorElement =
    document.getElementById("loginError");

  const username =
    input.value.trim();

  if(!/^[A-Za-zÅÄÖåäöÉéÜü_-]{2,50}$/.test(username)){

    errorElement.textContent =
      "Skriv ditt för- och efternamn utan mellanslag, exempelvis AdamPersson.";

    return;
  }

  errorElement.textContent="";

  try{

    const response =
      await fetch(
        `${API_URL}?user=${encodeURIComponent(username)}`
      );

    if(!response.ok)
      throw new Error();

    currentUser=username;

    localStorage.setItem(
      "minaTeckenUser",
      username
    );

    updateUserArea();

    load("home");

  }catch(error){

    console.error(error);

    errorElement.textContent =
      "Kunde inte ansluta till kalkylarket. Kontrollera Apps Script.";

  }

}


function logout(){

  currentUser="";

  localStorage.removeItem(
    "minaTeckenUser"
  );

  allSigns=[];

  editingRowId=null;

  editMode=false;

  showLogin();

}


function updateUserArea(){

  const area =
    document.getElementById("userArea");

  if(!currentUser){

    area.innerHTML="";

    return;
  }

  area.innerHTML=`

    <span class="user-name">
      ${escapeHtml(currentUser)}
    </span>

    <button
      class="logout-button"
      id="logoutButton"
    >

      <span class="material-symbols-rounded">
        logout
      </span>

      Logga ut

    </button>
  `;

  document.getElementById("logoutButton")
    .onclick=logout;

}


/* =========================
   API
========================= */

async function getSigns(){

  if(!currentUser)
    return [];

  const response =
    await fetch(
      `${API_URL}?user=${encodeURIComponent(currentUser)}`
    );

  if(!response.ok)
    throw new Error(
      "Kunde inte hämta data."
    );

  const result =
    await response.json();

  if(Array.isArray(result))
    return result;

  return result.data || [];

}


async function sendData(data){

  const response =
    await fetch(
      API_URL,
      {
        method:"POST",
        body:JSON.stringify({
          user:currentUser,
          ...data
        })
      }
    );

  if(!response.ok)
    throw new Error(
      "Serverfel."
    );

  return await response.json();

}


/* =========================
   NAVIGATION
========================= */

function load(page){

  if(!currentUser){

    showLogin();

    return;
  }

  document.getElementById("nav")
    .style.display =
      page==="home"
        ? "none"
        : "flex";

  document
    .querySelectorAll(".nav-btn")
    .forEach(button=>{

      button.classList.toggle(
        "active",
        button.dataset.page===page
      );

    });

  app.replaceChildren(
    clone(`${page}Template`)
  );

  if(page==="home")
    showHome();

  if(page==="add")
    showAdd();

  if(page==="dictionary")
    showDictionary();

  if(page==="quiz")
    showQuiz();

}


function bindPageButtons(){

  document
    .querySelectorAll("[data-page]")
    .forEach(button=>{

      button.onclick=()=>{
        load(button.dataset.page);
      };

    });

}


function showHome(){

  bindPageButtons();

  const user =
    document.getElementById("welcomeUser");

  if(user){

    user.textContent =
      `Inloggad som ${currentUser}`;

  }

}


/* =========================
   ADD / EDIT
========================= */

async function showAdd(){

  try{

    allSigns =
      await getSigns();

    setupFolderSelect();

    setupForm();

  }catch(error){

    console.error(error);

    app.innerHTML=`

      <section class="page-card">

        <h2>Kunde inte läsa ordlistan</h2>

        <p>
          Kontrollera anslutningen till kalkylarket.
        </p>

      </section>
    `;

  }

}

function setupFolderSelect(){

  const folders =
    [
      ...new Set(
        allSigns
          .map(row => String(row.folder || "").trim())
          .filter(Boolean)
      )
    ];

  const select =
    document.getElementById("folder");

  const box =
    document.getElementById("newFolderBox");

  box.style.display = "none";

  select.innerHTML = `

    <option value="">
      Ingen mapp
    </option>

    ${folders.map(folder => `

      <option value="${escapeHtml(folder)}">
        ${escapeHtml(folder)}
      </option>

    `).join("")}

    <option value="__NEW__">
      Ny mapp
    </option>

  `;

  select.onchange = () => {

    if(select.value === "__NEW__"){

      box.style.display = "block";

      const newFolder =
        document.getElementById("newFolder");

      newFolder.focus();

    }else{

      box.style.display = "none";

      document.getElementById(
        "newFolder"
      ).value = "";

    }

  };

}


function setupForm(){

  const form =
    document.getElementById("signForm");

  const cancel =
    document.getElementById(
      "cancelEditButton"
    );

  const title =
    document.getElementById(
      "formTitle"
    );

  const titleIcon =
    document.getElementById(
      "formTitleIcon"
    );

  const buttonText =
    document.getElementById(
      "formButtonText"
    );

  const buttonIcon =
    document.getElementById(
      "formButtonIcon"
    );

  if(editingRowId){

    title.textContent =
      "Redigera ord";

    titleIcon.textContent =
      "edit";

    buttonText.textContent =
      "Spara ändringar";

    buttonIcon.textContent =
      "save";

    cancel.style.display =
      "inline-flex";

    const row =
      allSigns.find(
        item =>
          String(item.id) ===
          String(editingRowId)
      );

    if(row){

      document.getElementById("word")
        .value=row.word || "";

      document.getElementById("video")
        .value=row.video || "";

      document.getElementById("week")
        .value=row.week || "";

      document.getElementById("year")
        .value=row.year || "";

      const folder =
        document.getElementById("folder");

      const newFolderBox =
        document.getElementById("newFolderBox");

      newFolderBox.style.display = "none";

      const existingOption =
        [...folder.options]
          .find(
            option =>
              option.value ===
              String(row.folder || "")
          );

      if(existingOption){

        folder.value =
          String(row.folder || "");

      }else if(row.folder){

        folder.insertAdjacentHTML(
          "afterbegin",
          `
          <option
            value="${escapeHtml(row.folder)}"
          >
            ${escapeHtml(row.folder)}
          </option>
          `
        );

        folder.value =
          String(row.folder);

      }

    }

  }else{

    title.textContent =
      "Lägg till ord";

    titleIcon.textContent =
      "add";

    buttonText.textContent =
      "Spara ord";

    buttonIcon.textContent =
      "save";

    cancel.style.display =
      "none";

  }


  cancel.onclick=()=>{

    editingRowId=null;

    load("dictionary");

  };


  form.onsubmit=
    saveWord;

}


async function saveWord(event){

  event.preventDefault();

  const word =
    document.getElementById("word")
      .value.trim();

  const video =
    document.getElementById("video")
      .value.trim();

  const week =
    document.getElementById("week")
      .value.trim();

  const year =
    document.getElementById("year")
      .value.trim();

  const folderSelect =
    document.getElementById("folder");

  let folder =
    folderSelect.value;

  if(folder==="__NEW__"){

    folder =
      document.getElementById(
        "newFolder"
      ).value.trim();

    if(!folder){

      alert(
        "Skriv namnet på den nya mappen."
      );

      return;
    }

  }

  if(!word){

    alert(
      "Skriv ett ord först."
    );

    return;
  }

  try{

    if(editingRowId){

      await sendData({

        action:"update",

        id:editingRowId,

        word,
        video,
        week,
        year,
        folder

      });

      alert(
        "Ordet uppdaterades!"
      );

    }else{

      await sendData({

        action:"add",

        word,
        video,
        week,
        year,
        folder

      });

      alert(
        "Ordet sparades!"
      );

    }

    editingRowId=null;

    load("dictionary");

  }catch(error){

    console.error(error);

    alert(
      "Kunde inte spara ändringen."
    );

  }

}


/* =========================
   DICTIONARY
========================= */

async function showDictionary(){

  editMode=false;

  try{

    allSigns =
      await getSigns();

    setupDictionary();

  }catch(error){

    console.error(error);

    document.getElementById(
      "signList"
    ).textContent =
      "Kunde inte ladda ordlistan.";

  }

}


function setupDictionary(){

  const weeks =
    [
      ...new Set(
        allSigns
          .map(row =>
            `${row.week || ""}-${row.year || ""}`
          )
      )
    ]
    .filter(item=>item!=="-");


  const folders =
    [
      ...new Set(
        allSigns
          .map(row=>row.folder)
          .filter(Boolean)
      )
    ];


  document.getElementById(
    "weekSelect"
  ).innerHTML=`

    <option value="all">
      Alla veckor
    </option>

    ${weeks.map(item=>{

      const [
        week,
        year
      ]=item.split("-");

      return `

        <option
          value="${escapeHtml(item)}"
        >
          Vecka ${escapeHtml(week)},
          ${escapeHtml(year)}
        </option>

      `;

    }).join("")}
  `;


  document.getElementById(
    "folderSelect"
  ).innerHTML=`

    <option value="all">
      Alla mappar
    </option>

    ${folders.map(folder=>`

      <option
        value="${escapeHtml(folder)}"
      >
        ${escapeHtml(folder)}
      </option>

    `).join("")}
  `;


  [
    "sortSelect",
    "weekSelect",
    "folderSelect"
  ].forEach(id=>{

    document.getElementById(id)
      .onchange=renderSigns;

  });


  document.getElementById(
    "editModeButton"
  ).onclick=toggleEditMode;


  renderSigns();

}


function toggleEditMode(){

  editMode=!editMode;

  const button =
    document.getElementById(
      "editModeButton"
    );

  button.classList.toggle(
    "active",
    editMode
  );

  button.innerHTML=editMode
    ? `
      <span class="material-symbols-rounded">
        close
      </span>
      Avsluta redigering
    `
    : `
      <span class="material-symbols-rounded">
        edit
      </span>
      Redigeringsläge
    `;

  renderSigns();

}


function renderSigns(){

  const week =
    document.getElementById(
      "weekSelect"
    ).value;

  const folder =
    document.getElementById(
      "folderSelect"
    ).value;

  const sort =
    document.getElementById(
      "sortSelect"
    ).value;


  let signs =
    allSigns.filter(row=>{

      const rowWeek =
        `${row.week || ""}-${row.year || ""}`;

      return (
        (week==="all" || rowWeek===week) &&
        (folder==="all" ||
          String(row.folder)===String(folder))
      );

    });


  if(sort==="az"){

    signs.sort(
      (a,b)=>
        String(a.word)
          .localeCompare(
            String(b.word),
            "sv"
          )
    );

  }


  if(sort==="old"){

    signs.sort(
      (a,b)=>
        Number(a.id)-Number(b.id)
    );

  }


  if(sort==="new"){

    signs.sort(
      (a,b)=>
        Number(b.id)-Number(a.id)
    );

  }


  const list =
    document.getElementById(
      "signList"
    );


  if(!signs.length){

    list.innerHTML=`

      <div class="quiz-info">
        Du har inga ord ännu.
      </div>

    `;

    return;

  }


  list.innerHTML =
    signs.map(row=>`

      <div
        class="flip-card"
        data-id="${escapeHtml(row.id)}"
        data-video="${escapeHtml(row.video || "")}"
      >

        <div class="flip-card-inner">

          <div class="flip-card-front">

            ${
              editMode
                ? `
                  <div class="editing-label">
                    Redigering
                  </div>
                `
                : ""
            }

            <h3>
              ${escapeHtml(row.word)}
            </h3>

            <p>
              Vecka:
              ${escapeHtml(row.week || "-")}
            </p>

            <p>
              År:
              ${escapeHtml(row.year || "-")}
            </p>

            <p>
              Mapp:
              ${escapeHtml(row.folder || "-")}
            </p>

            ${
              editMode
                ? `
                  <div class="edit-controls">

                    <button
                      class="card-edit-button"
                      data-edit-id="${escapeHtml(row.id)}"
                    >
                      <span class="material-symbols-rounded">
                        edit
                      </span>
                      Redigera
                    </button>

                    <button
                      class="card-delete-button"
                      data-delete-id="${escapeHtml(row.id)}"
                    >
                      <span class="material-symbols-rounded">
                        delete
                      </span>
                      Ta bort
                    </button>

                  </div>
                `
                : ""
            }

          </div>

          <div class="flip-card-back">

            <div class="video-container"></div>

          </div>

        </div>

      </div>

    `).join("");


  document
    .querySelectorAll(".flip-card")
    .forEach(card=>{

      card.onclick=event=>{

        if(
          event.target.closest(
            ".edit-controls"
          )
        ){

          return;

        }

        const box =
          card.querySelector(
            ".video-container"
          );


        if(
          card.classList.toggle(
            "flipped"
          )
        ){

          box.innerHTML =
            createVideo(
              card.dataset.video
            );

          setupVideo(
            card,
            box
          );

        }else{

          box.innerHTML="";

        }

      };

    });


  document
    .querySelectorAll(
      "[data-edit-id]"
    )
    .forEach(button=>{

      button.onclick=event=>{

        event.stopPropagation();

        editingRowId =
          button.dataset.editId;

        load("add");

      };

    });


  document
    .querySelectorAll(
      "[data-delete-id]"
    )
    .forEach(button=>{

      button.onclick=async event=>{

        event.stopPropagation();

        await deleteWord(
          button.dataset.deleteId
        );

      };

    });

}


async function deleteWord(id){

  const row =
    allSigns.find(
      item =>
        String(item.id)===String(id)
    );

  if(!row)
    return;


  const confirmDelete =
    confirm(
      `Vill du verkligen ta bort "${row.word}"?`
    );


  if(!confirmDelete)
    return;


  try{

    await sendData({

      action:"delete",

      id:id

    });

    allSigns =
      await getSigns();

    renderSigns();

  }catch(error){

    console.error(error);

    alert(
      "Kunde inte ta bort ordet."
    );

  }

}


/* =========================
   VIDEO
========================= */

function createVideo(url){

  if(!url)
    return "";

  url=String(url).trim();


  if(
    url.toLowerCase().includes(".mp4")
  ){

    return `

      <video
        class="mp4-video"
        autoplay
        muted
        playsinline
        controls
      >

        <source
          src="${escapeHtml(url)}"
          type="video/mp4"
        >

      </video>

    `;

  }


  if(
    url.includes("youtube.com") ||
    url.includes("youtu.be")
  ){

    const id =
      getYoutubeId(url);

    if(!id)
      return "";


    return `

      <iframe
        class="youtube-video"
        src="https://www.youtube.com/embed/${id}?enablejsapi=1&autoplay=1&mute=1&controls=1&rel=0"
        allow="autoplay; encrypted-media"
        allowfullscreen
      ></iframe>

    `;

  }


  return "";

}


function getYoutubeId(url){

  try{

    const parsed =
      new URL(url);


    if(
      parsed.hostname.includes(
        "youtu.be"
      )
    ){

      return parsed.pathname
        .replace("/","")
        .split("/")[0];

    }


    if(
      parsed.hostname.includes(
        "youtube.com"
      )
    ){

      const id =
        parsed.searchParams.get(
          "v"
        );

      if(id)
        return id;


      const parts =
        parsed.pathname
          .split("/")
          .filter(Boolean);


      const index =
        parts.indexOf("embed");


      if(index!==-1)
        return parts[index+1];

    }

  }catch{}

  return "";

}


function setupVideo(card,box){

  const video =
    box.querySelector(
      "video"
    );


  if(video){

    video.onended=()=>{

      setTimeout(()=>{

        card.classList.remove(
          "flipped"
        );

        box.innerHTML="";

      },500);

    };

  }


  const iframe =
    box.querySelector(
      "iframe"
    );


  if(iframe){

    loadYoutubeAPI(()=>{

      try{

        new YT.Player(
          iframe,
          {
            events:{
              onStateChange:event=>{

                if(
                  event.data ===
                  YT.PlayerState.ENDED
                ){

                  setTimeout(()=>{

                    card.classList.remove(
                      "flipped"
                    );

                    box.innerHTML="";

                  },500);

                }

              }
            }
          }
        );

      }catch{}

    });

  }

}


function loadYoutubeAPI(callback){

  if(window.YT?.Player){

    callback();

    return;

  }


  if(
    !document.getElementById(
      "youtube-api"
    )
  ){

    const script =
      document.createElement(
        "script"
      );

    script.id =
      "youtube-api";

    script.src =
      "https://www.youtube.com/iframe_api";

    document.body.appendChild(
      script
    );

    window.onYouTubeIframeAPIReady =
      callback;

  }else{

    setTimeout(
      ()=>loadYoutubeAPI(callback),
      200
    );

  }

}


/* =========================
   QUIZ
========================= */

async function showQuiz(){

  try{

    allSigns =
      await getSigns();

    showQuizSetup();

  }catch(error){

    console.error(error);

    document.getElementById(
      "quizContent"
    ).textContent =
      "Kunde inte ladda tecknen.";

  }

}


function showQuizSetup(){

  const content =
    document.getElementById(
      "quizContent"
    );

  content.replaceChildren(
    clone("quizSetupTemplate")
  );


  document
    .querySelectorAll(
      'input[name="quizSelection"]'
    )
    .forEach(input=>{

      input.onchange =
        updateQuizSelectionDetails;

    });


  document.getElementById(
    "startQuizButton"
  ).onclick=prepareQuiz;


  updateQuizSelectionDetails();

}


function updateQuizSelectionDetails(){

  const selected =
    document.querySelector(
      'input[name="quizSelection"]:checked'
    ).value;


  const details =
    document.getElementById(
      "quizSelectionDetails"
    );


  if(selected==="all"){

    details.innerHTML=`

      <p class="quiz-info">

        Alla inlagda tecken kommer att användas.
        <br>
        Maxantal:
        ${allSigns.length}
        tecken.

      </p>

    `;

    return;

  }


  if(selected==="folder"){

    const folders =
      [
        ...new Set(
          allSigns
            .map(row=>row.folder)
            .filter(Boolean)
        )
      ];


    details.innerHTML=`

      <label for="quizFolderSelect">
        Välj kategori
      </label>

      <select id="quizFolderSelect">

        <option value="">
          Välj kategori
        </option>

        ${folders.map(folder=>`

          <option
            value="${escapeHtml(folder)}"
          >
            ${escapeHtml(folder)}
          </option>

        `).join("")}

      </select>

    `;

    return;

  }


  if(selected==="week"){

    const weeks =
      [
        ...new Set(
          allSigns.map(
            row =>
              `${row.week || ""}-${row.year || ""}`
          )
        )
      ];


    const years =
      [
        ...new Set(
          allSigns
            .map(row=>row.year)
            .filter(Boolean)
        )
      ].sort();


    details.innerHTML=`

      <div class="quiz-week-fields">

        <div>

          <label for="quizWeekSelect">
            Vecka
          </label>

          <select id="quizWeekSelect">

            <option value="">
              Välj vecka
            </option>

            ${weeks.map(item=>{

              const [
                week
              ]=item.split("-");

              return `

                <option
                  value="${escapeHtml(item)}"
                >
                  Vecka
                  ${escapeHtml(week)}
                </option>

              `;

            }).join("")}

          </select>

        </div>


        <div>

          <label for="quizYearSelect">
            År
          </label>

          <select id="quizYearSelect">

            <option value="">
              Välj år
            </option>

            ${years.map(year=>`

              <option
                value="${escapeHtml(year)}"
              >
                ${escapeHtml(year)}
              </option>

            `).join("")}

          </select>

        </div>

      </div>

    `;

    return;

  }


  if(selected==="manual"){

    details.innerHTML=`

      <p class="quiz-info">
        Bocka i de tecken du vill förhöras på.
      </p>

      <div class="manual-sign-list">

        ${allSigns.map((row,index)=>`

          <label class="manual-sign">

            <input
              type="checkbox"
              class="manual-sign-checkbox"
              value="${index}"
            >

            <span>
              ${escapeHtml(row.word)}
            </span>

          </label>

        `).join("")}

      </div>

    `;

    return;

  }


  const max =
    allSigns.length;


  details.innerHTML=`

    <div class="random-count-box">

      <label for="randomCount">
        Antal tecken
      </label>

      <input
        id="randomCount"
        type="number"
        min="1"
        max="${max}"
        value="${Math.min(10,max)}"
      >

      <small>
        Maxantal:
        ${max}
        tecken
      </small>

      <div
        id="randomCountError"
        class="quiz-error"
      ></div>

    </div>

  `;


  document.getElementById(
    "randomCount"
  ).oninput=
    validateRandomCount;

}


function validateRandomCount(){

  const input =
    document.getElementById(
      "randomCount"
    );

  const error =
    document.getElementById(
      "randomCountError"
    );

  const value =
    Number(input.value);


  if(value>allSigns.length){

    error.textContent =
      `Du kan välja högst ${allSigns.length} tecken.`;

    input.classList.add(
      "quiz-input-error"
    );

  }else if(value<1){

    error.textContent =
      "Du måste välja minst 1 tecken.";

    input.classList.add(
      "quiz-input-error"
    );

  }else{

    error.textContent="";

    input.classList.remove(
      "quiz-input-error"
    );

  }

}


function prepareQuiz(){

  const selection =
    document.querySelector(
      'input[name="quizSelection"]:checked'
    ).value;


  let selected=[];


  if(selection==="all"){

    selected=[
      ...allSigns
    ];

  }


  if(selection==="folder"){

    const folder =
      document.getElementById(
        "quizFolderSelect"
      ).value;


    if(!folder){

      alert(
        "Välj en kategori först."
      );

      return;

    }


    selected =
      allSigns.filter(
        row =>
          String(row.folder) ===
          String(folder)
      );

  }


  if(selection==="week"){

    const week =
      document.getElementById(
        "quizWeekSelect"
      ).value;

    const year =
      document.getElementById(
        "quizYearSelect"
      ).value;


    if(!week || !year){

      alert(
        "Välj både vecka och år."
      );

      return;

    }


    const weekNumber =
      week.split("-")[0];


    selected =
      allSigns.filter(
        row =>
          String(row.week) ===
            String(weekNumber) &&
          String(row.year) ===
            String(year)
      );

  }


  if(selection==="manual"){

    selected =
      [
        ...document.querySelectorAll(
          ".manual-sign-checkbox:checked"
        )
      ]
      .map(
        input =>
          allSigns[
            Number(input.value)
          ]
      );


    if(!selected.length){

      alert(
        "Välj minst ett tecken."
      );

      return;

    }

  }


  if(selection==="random"){

    const count =
      Number(
        document.getElementById(
          "randomCount"
        ).value
      );


    if(
      !count ||
      count<1
    ){

      alert(
        "Ange hur många tecken du vill förhöras på."
      );

      return;

    }


    if(count>allSigns.length){

      alert(
        `Du kan välja högst ${allSigns.length} tecken.`
      );

      return;

    }


    selected =
      shuffle([
        ...allSigns
      ]).slice(
        0,
        count
      );

  }


  if(!selected.length){

    alert(
      "Det finns inga tecken att förhöra på i det här urvalet."
    );

    return;

  }


  quizSigns =
    shuffle([
      ...selected
    ]);

  quizIndex=0;

  showQuizTypeChoice();

}


function showQuizTypeChoice(){

  const content =
    document.getElementById(
      "quizContent"
    );

  content.replaceChildren(
    clone("quizTypeTemplate")
  );


  document.getElementById(
    "showSignQuiz"
  ).onclick=()=>{

    quizQuestionMode="sign";

    showSignAnswerChoice();

  };


  document.getElementById(
    "showWordQuiz"
  ).onclick=()=>{

    quizQuestionMode="word";

    quizAnswerMode="none";

    quizIndex=0;

    showNextQuizQuestion();

  };

}


function showSignAnswerChoice(){

  const content =
    document.getElementById(
      "quizContent"
    );

  content.replaceChildren(
    clone("signAnswerTemplate")
  );


  document.getElementById(
    "writeAnswerBtn"
  ).onclick=()=>{

    quizAnswerMode="write";

    quizIndex=0;

    showNextQuizQuestion();

  };


  document.getElementById(
    "multipleChoiceBtn"
  ).onclick=()=>{

    quizAnswerMode="multiple";

    quizIndex=0;

    showNextQuizQuestion();

  };

}


function showNextQuizQuestion(){

  if(
    quizIndex>=quizSigns.length
  ){

    showQuizFinished();

    return;

  }


  quizQuestionMode==="sign"
    ? showSignQuestion()
    : showWordQuestion();

}


function showSignQuestion(){

  const sign =
    quizSigns[quizIndex];

  const progress =
    `${quizIndex+1} av ${quizSigns.length}`;

  const content =
    document.getElementById(
      "quizContent"
    );


  if(
    quizAnswerMode==="write"
  ){

    content.innerHTML=`

      <div class="quiz-question">

        <div class="quiz-progress">
          Fråga ${progress}
        </div>

        <h3>
          Vilket ord är detta tecken?
        </h3>

        <div class="quiz-video-box">
          ${createVideo(sign.video)}
        </div>

        <div class="quiz-answer-area">

          <input
            id="quizTextAnswer"
            class="quiz-text-answer"
            placeholder="Skriv ditt svar..."
            autocomplete="off"
          >

          <button
            id="checkQuizAnswer"
            class="quiz-main-btn"
          >
            Kontrollera svar
          </button>

        </div>

        <div
          id="quizFeedback"
          class="quiz-feedback"
        ></div>

        <div id="quizNextArea"></div>

      </div>

    `;


    setupQuizVideo();

    document.getElementById(
      "checkQuizAnswer"
    ).onclick=
      checkWrittenAnswer;


    document.getElementById(
      "quizTextAnswer"
    ).onkeydown=event=>{

      if(event.key==="Enter")
        checkWrittenAnswer();

    };

    return;

  }


  const options =
    createMultipleChoiceOptions(
      sign
    );


  content.innerHTML=`

    <div class="quiz-question">

      <div class="quiz-progress">
        Fråga ${progress}
      </div>

      <h3>
        Vilket ord är detta tecken?
      </h3>

      <div class="quiz-video-box">
        ${createVideo(sign.video)}
      </div>

      <div class="multiple-choice-grid">

        ${options.map(option=>`

          <button
            class="multiple-choice-btn"
            data-answer="${escapeHtml(option)}"
          >
            ${escapeHtml(option)}
          </button>

        `).join("")}

      </div>

      <div
        id="quizFeedback"
        class="quiz-feedback"
      ></div>

      <div id="quizNextArea"></div>

    </div>

  `;


  setupQuizVideo();


  document
    .querySelectorAll(
      ".multiple-choice-btn"
    )
    .forEach(button=>{

      button.onclick=()=>{
        checkMultipleChoice(
          button
        );
      };

    });

}


function createMultipleChoiceOptions(
  correctSign
){

  const correct =
    correctSign.word;


  const distractors =
    shuffle(
      allSigns.filter(
        row =>
          row.word !== correct
      )
    )
    .slice(0,3)
    .map(row=>row.word);


  return shuffle([
    correct,
    ...distractors
  ]);

}


function checkWrittenAnswer(){

  const input =
    document.getElementById(
      "quizTextAnswer"
    );

  const answer =
    input.value
      .trim()
      .toLowerCase();


  const correct =
    String(
      quizSigns[quizIndex].word
    )
    .trim()
    .toLowerCase();


  const feedback =
    document.getElementById(
      "quizFeedback"
    );


  if(!answer){

    feedback.innerHTML=
      `
      <div class="quiz-feedback-wrong">
        Skriv ett svar först.
      </div>
      `;

    return;

  }


  feedback.innerHTML =
    answer===correct

      ? `
        <div class="quiz-feedback-correct">
          ✓ Rätt svar!
        </div>
      `

      : `
        <div class="quiz-feedback-wrong">

          ✕ Inte riktigt.

          <strong>
            Rätt svar:
            ${escapeHtml(
              quizSigns[quizIndex].word
            )}
          </strong>

        </div>
      `;


  input.disabled=true;

  document.getElementById(
    "checkQuizAnswer"
  ).disabled=true;

  showNextButton();

}


function checkMultipleChoice(clicked){

  const correct =
    String(
      quizSigns[quizIndex].word
    );


  document
    .querySelectorAll(
      ".multiple-choice-btn"
    )
    .forEach(button=>{

      button.disabled=true;

      if(
        button.dataset.answer===
        correct
      ){

        button.classList.add(
          "correct"
        );

      }

    });


  const feedback =
    document.getElementById(
      "quizFeedback"
    );


  if(
    clicked.dataset.answer===
    correct
  ){

    clicked.classList.add(
      "correct"
    );

    feedback.innerHTML=
      `
      <div class="quiz-feedback-correct">
        ✓ Rätt svar!
      </div>
      `;

  }else{

    clicked.classList.add(
      "wrong"
    );

    feedback.innerHTML=
      `
      <div class="quiz-feedback-wrong">

        ✕ Fel svar.

        <strong>
          Rätt svar:
          ${escapeHtml(correct)}
        </strong>

      </div>
      `;

  }


  showNextButton();

}


function showNextButton(){

  const area =
    document.getElementById(
      "quizNextArea"
    );


  area.innerHTML=`

    <button
      id="nextQuizButton"
      class="quiz-main-btn"
    >

      ${
        quizIndex+1<
        quizSigns.length
          ? "Nästa fråga"
          : "Visa resultat"
      }

    </button>

  `;


  document.getElementById(
    "nextQuizButton"
  ).onclick=()=>{

    quizIndex++;

    showNextQuizQuestion();

  };

}


function showWordQuestion(){

  const sign =
    quizSigns[quizIndex];


  document.getElementById(
    "quizContent"
  ).innerHTML=`

    <div class="quiz-question">

      <div class="quiz-progress">

        Fråga
        ${quizIndex+1}
        av
        ${quizSigns.length}

      </div>

      <h3>

        Hur tecknas
        <strong>
          ${escapeHtml(sign.word)}
        </strong>?

      </h3>


      <button
        id="showAnswerButton"
        class="quiz-main-btn"
      >

        <span class="material-symbols-rounded">
          visibility
        </span>

        Visa facit

      </button>


      <div
        id="quizAnswer"
        class="quiz-answer-hidden"
      ></div>

    </div>

  `;


  document.getElementById(
    "showAnswerButton"
  ).onclick=
    showWordAnswer;

}


function showWordAnswer(){

  const sign =
    quizSigns[quizIndex];


  const answer =
    document.getElementById(
      "quizAnswer"
    );


  if(!answer)
    return;


  answer.classList.remove(
    "quiz-answer-hidden"
  );


  answer.innerHTML=`

    <div class="quiz-facit">

      <h4>Facit</h4>

      <div
        class="quiz-video-box"
        id="wordAnswerVideo"
      >
        ${createVideo(sign.video)}
      </div>


      <button
        id="replaySignButton"
        class="quiz-secondary-btn"
      >

        <span class="material-symbols-rounded">
          replay
        </span>

        Visa tecknet igen

      </button>


      <button
        id="nextWordQuestion"
        class="quiz-main-btn"
      >

        ${
          quizIndex+1<
          quizSigns.length
            ? "Nästa fråga"
            : "Visa resultat"
        }

      </button>

    </div>

  `;


  const videoBox =
    document.getElementById(
      "wordAnswerVideo"
    );


  setupQuizVideo(
    videoBox
  );


  document.getElementById(
    "replaySignButton"
  ).onclick=()=>{

    videoBox.innerHTML =
      createVideo(sign.video);

    setupQuizVideo(
      videoBox
    );

  };


  document.getElementById(
    "nextWordQuestion"
  ).onclick=()=>{

    quizIndex++;

    showNextQuizQuestion();

  };

}


function setupQuizVideo(
  container=null
){

  const box =
    container ||
    document.querySelector(
      ".quiz-video-box"
    );


  if(!box)
    return;


  const video =
    box.querySelector(
      "video"
    );


  if(video){

    video.play().catch(
      ()=>{}
    );

  }


  const iframe =
    box.querySelector(
      "iframe"
    );


  if(iframe){

    loadYoutubeAPI(()=>{

      try{
        new YT.Player(
          iframe
        );
      }catch{}

    });

  }

}


function showQuizFinished(){

  const content =
    document.getElementById(
      "quizContent"
    );


  content.replaceChildren(
    clone(
      "quizFinishedTemplate"
    )
  );


  document.getElementById(
    "finishedText"
  ).textContent =
    `Du har gått igenom ${quizSigns.length} tecken.`;


  document.getElementById(
    "restartQuiz"
  ).onclick=
    showQuizSetup;

}


/* =========================
   GLOBAL EVENTS
========================= */

document.addEventListener(
  "click",
  event=>{

    const button =
      event.target.closest(
        "[data-page]"
      );

    if(button){

      event.preventDefault();

      load(
        button.dataset.page
      );

    }

  }
);


document.addEventListener(
  "keydown",
  event=>{

    if(
      quizQuestionMode!=="word"
    )
      return;


    const active =
      document.activeElement;


    if(
      [
        "INPUT",
        "TEXTAREA",
        "SELECT"
      ].includes(
        active?.tagName
      )
    )
      return;


    if(event.key==="Enter"){

      event.preventDefault();


      const answer =
        document.getElementById(
          "quizAnswer"
        );


      if(
        answer?.classList.contains(
          "quiz-answer-hidden"
        )
      ){

        showWordAnswer();

      }else{

        document.getElementById(
          "nextWordQuestion"
        )?.click();

      }

    }


    if(event.code==="Space"){

      event.preventDefault();


      const answer =
        document.getElementById(
          "quizAnswer"
        );


      if(
        !answer ||
        answer.classList.contains(
          "quiz-answer-hidden"
        )
      )
        return;


      document.getElementById(
        "replaySignButton"
      )?.click();

    }

  }
);


/* =========================
   START
========================= */

updateUserArea();

if(currentUser){

  load("home");

}else{

  showLogin();

}
