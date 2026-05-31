function safeText(id, value){
  const el=document.getElementById(id);
  if(el) el.textContent=value;
}

function safeShow(id){
  const el=document.getElementById(id);
  if(el) el.classList.remove("hidden");
}

function safeHide(id){
  const el=document.getElementById(id);
  if(el) el.classList.add("hidden");
}



export { safeText, safeShow, safeHide };
