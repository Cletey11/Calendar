(() => {
  "use strict";

  // Fill these two values with Supabase Project URL and publishable key.
  const SUPABASE_URL = "https://qgqxsdskyfdbglcbomzb.supabase.co/rest/v1/";
  const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_nD1-8ma3eENmgKvp2QBQqw_Fg7I2vPi";
  const ALLOWED_USERS = {
    "3b76df6d-cf06-4344-b636-7270cbf43b89": "caleb",
    "e03dee0d-9e3c-47e9-a415-4209e3a53212": "cassie"
  };

  const $ = id => document.getElementById(id);
  const grid = $("calendarGrid"), monthTitle = $("monthTitle"), modalBackdrop = $("modalBackdrop");
  const modalDate = $("modalDate"), memoryText = $("memoryText"), charCount = $("charCount");
  const modalStatus = $("modalStatus"), deleteButton = $("deleteMemory"), dayMemories = $("dayMemories");
  const toast = $("toast"), authScreen = $("authScreen"), authForm = $("authForm"), authStatus = $("authStatus");
  const appPage = $("appPage"), authorLabel = $("authorLabel");
  let supabase = null, currentUser = null, currentAuthor = null;
  let view = new Date(); view.setDate(1); let selectedDate = null, editingId = null, memories = [];

  const pad = n => String(n).padStart(2, "0");
  const dateKey = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;
  const toKey = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const prettyDate = key => new Date(`${key}T12:00:00`).toLocaleDateString(undefined, {weekday:"long",month:"long",day:"numeric",year:"numeric"});
  const escapeHtml = s => String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  function showToast(msg) { toast.textContent = msg; toast.classList.remove("hidden"); setTimeout(() => toast.classList.add("hidden"), 2400); }
  function setStatus(el, msg) { el.textContent = msg || ""; }
  function checkConfig() {
    if (!window.supabase?.createClient) { setStatus(authStatus, "Couldn't load the Supabase library. Refresh the page and try again."); return false; }
    if (SUPABASE_URL.includes("PASTE_YOUR_") || SUPABASE_PUBLISHABLE_KEY.includes("PASTE_YOUR_")) {
      setStatus(authStatus, "Setup needed: add your Supabase Project URL and publishable key in app.js first."); return false;
    }
    try { supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY); return true; }
    catch (e) { console.error(e); setStatus(authStatus, "The Supabase settings look invalid. Check the URL and publishable key in app.js."); return false; }
  }

  async function signIn(e) {
    e.preventDefault(); if (!checkConfig()) return;
    const button = $("signInButton"); button.disabled = true; setStatus(authStatus, "Signing in…");
    const {error} = await supabase.auth.signInWithPassword({email:$("email").value.trim(), password:$("password").value});
    button.disabled = false;
    if (error) { setStatus(authStatus, error.message); return; }
    await startSession();
  }
  async function signOut() { if (supabase) await supabase.auth.signOut(); currentUser = null; currentAuthor = null; memories = []; appPage.classList.add("hidden"); authScreen.classList.remove("hidden"); authForm.reset(); setStatus(authStatus, "You have signed out."); }
  async function startSession() {
    const {data:{session}, error} = await supabase.auth.getSession();
    if (error) { setStatus(authStatus, error.message); return; }
    if (!session?.user) { authScreen.classList.remove("hidden"); appPage.classList.add("hidden"); return; }
    currentUser = session.user; currentAuthor = ALLOWED_USERS[currentUser.id];
    if (!currentAuthor) { await supabase.auth.signOut(); setStatus(authStatus, "This account isn't authorized for this private calendar."); authScreen.classList.remove("hidden"); appPage.classList.add("hidden"); return; }
    authScreen.classList.add("hidden"); appPage.classList.remove("hidden");
    $("signedInAs").textContent = `Signed in as ${currentAuthor === "caleb" ? "Caleb" : "Cassie"}`;
    authorLabel.textContent = currentAuthor === "caleb" ? "💜 Adding as Caleb" : "💗 Adding as Cassie";
    authorLabel.style.background = currentAuthor === "caleb" ? "var(--purple-pale)" : "var(--pink-pale)";
    authorLabel.style.color = currentAuthor === "caleb" ? "var(--purple-deep)" : "#a44970";
    await loadMemories();
  }
  async function loadMemories() {
    if (!supabase || !currentUser) return;
    const {data, error} = await supabase.from("memories").select("id,memory_date,author,content,created_at,updated_at").order("memory_date").order("created_at");
    if (error) { console.error(error); showToast(`Couldn't load memories: ${error.message}`); return; }
    memories = (data || []).map(m => ({...m, text:m.content})); render();
    if (selectedDate) renderDayMemories();
  }
  function render() {
    const y = view.getFullYear(), m = view.getMonth(); monthTitle.textContent = view.toLocaleString(undefined,{month:"long",year:"numeric"}); grid.innerHTML = "";
    const first = new Date(y,m,1).getDay(), days = new Date(y,m+1,0).getDate();
    for (let i=0;i<first;i++){const empty=document.createElement("div");empty.className="day empty";grid.appendChild(empty);}
    const todayKey=toKey(new Date());
    for(let d=1;d<=days;d++){
      const key=dateKey(y,m,d), entries=memories.filter(x=>x.memory_date===key), button=document.createElement("button");
      button.type="button";button.className="day";if(key===todayKey)button.classList.add("today");
      const previews=entries.slice(0,3).map(mem=>`<div class="memory-preview ${mem.author}"><b>${mem.author==="caleb"?"Caleb":"Cassie"}:</b> ${escapeHtml(mem.text)}</div>`).join("");
      const more=entries.length>3?`<div class="more">+ ${entries.length-3} more</div>`:"";
      button.innerHTML=`<div class="day-number">${d}${entries.length?'<span class="dot-count">♥</span>':""}</div><div class="memory-list">${previews}${more}</div>`;
      button.addEventListener("click",()=>openModal(key));grid.appendChild(button);
    }
  }
  function renderDayMemories(){
    const entries=memories.filter(m=>m.memory_date===selectedDate);
    if(!entries.length){dayMemories.innerHTML='<div class="empty-memory">No memories yet. Add the first one. 💕</div>';return;}
    dayMemories.innerHTML=entries.map(mem=>`<div class="saved-memory ${mem.author}"><div><strong>${mem.author==="caleb"?"Caleb":"Cassie"}</strong><p>${escapeHtml(mem.text)}</p></div>${mem.author===currentAuthor?`<button type="button" class="edit-memory" data-id="${mem.id}">Edit</button>`:""}</div>`).join("");
    dayMemories.querySelectorAll(".edit-memory").forEach(btn=>btn.addEventListener("click",()=>startEditing(btn.dataset.id)));
  }
  function openModal(key){selectedDate=key;editingId=null;modalDate.textContent=prettyDate(key);$("modalTitle").textContent="Add a memory";memoryText.value="";setStatus(modalStatus,"");deleteButton.classList.add("hidden");authorLabel.textContent=currentAuthor==="caleb"?"💜 Adding as Caleb":"💗 Adding as Cassie";renderDayMemories();updateCount();modalBackdrop.classList.remove("hidden");setTimeout(()=>memoryText.focus(),50);}
  function startEditing(id){const mem=memories.find(m=>String(m.id)===String(id));if(!mem||mem.author!==currentAuthor)return;editingId=mem.id;memoryText.value=mem.text;$("modalTitle").textContent="Edit this memory";deleteButton.classList.remove("hidden");setStatus(modalStatus,"");updateCount();memoryText.focus();}
  function closeModal(){modalBackdrop.classList.add("hidden");selectedDate=null;editingId=null;}
  function updateCount(){charCount.textContent=memoryText.value.length;}
  async function saveMemory(){
    const text=memoryText.value.trim();if(!text||!selectedDate){setStatus(modalStatus,"Write a little something first ❤️");return;}
    const button=$("saveMemory");button.disabled=true;setStatus(modalStatus,"Saving…");
    let result;
    if(editingId){result=await supabase.from("memories").update({memory_date:selectedDate,content:text,updated_at:new Date().toISOString()}).eq("id",editingId).eq("author",currentAuthor).select("id").maybeSingle();}
    else{result=await supabase.from("memories").insert({memory_date:selectedDate,author:currentAuthor,content:text}).select("id").single();}
    button.disabled=false;
    if(result.error){setStatus(modalStatus,result.error.message);return;}
    if(!result.data){setStatus(modalStatus,"No change was saved. You can only edit your own memories.");return;}
    const wasNew=!editingId;editingId=null;await loadMemories();renderDayMemories();showToast(wasNew?"Memory saved ❤️":"Memory updated ❤️");
    if(wasNew){memoryText.value="";updateCount();$("modalTitle").textContent="Add another memory";setStatus(modalStatus,"");}else{memoryText.value="";updateCount();deleteButton.classList.add("hidden");$("modalTitle").textContent="Add another memory";setStatus(modalStatus,"");}
  }
  async function deleteMemory(){
    if(!editingId||!confirm("Delete this memory? This cannot be undone."))return;
    const {error}=await supabase.from("memories").delete().eq("id",editingId).eq("author",currentAuthor);
    if(error){setStatus(modalStatus,error.message);return;}editingId=null;memoryText.value="";updateCount();deleteButton.classList.add("hidden");$("modalTitle").textContent="Add a memory";await loadMemories();renderDayMemories();showToast("Memory deleted.");
  }

  authForm.addEventListener("submit",signIn);$("signOutButton").addEventListener("click",signOut);
  $("saveMemory").addEventListener("click",saveMemory);deleteButton.addEventListener("click",deleteMemory);memoryText.addEventListener("input",updateCount);
  $("closeModal").addEventListener("click",closeModal);$("cancelModal").addEventListener("click",closeModal);
  modalBackdrop.addEventListener("click",e=>{if(e.target===modalBackdrop)closeModal();});
  document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!modalBackdrop.classList.contains("hidden"))closeModal();});
  $("prevMonth").addEventListener("click",()=>{view.setMonth(view.getMonth()-1);render();});
  $("nextMonth").addEventListener("click",()=>{view.setMonth(view.getMonth()+1);render();});
  $("todayButton").addEventListener("click",()=>{view=new Date();view.setDate(1);render();});
  if(checkConfig()){supabase.auth.onAuthStateChange((_event,session)=>{if(!session){currentUser=null;currentAuthor=null;appPage.classList.add("hidden");authScreen.classList.remove("hidden");} });startSession();}
  else {authScreen.classList.remove("hidden");appPage.classList.add("hidden");}
})();
