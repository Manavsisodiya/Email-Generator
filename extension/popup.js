const SERVER_URL = "https://email-generator-api-epbf.onrender.com"; 
let currentUserEmail = null;

document.getElementById('login-btn').onclick = () => {
  chrome.identity.getAuthToken({ interactive: true }, function(token) {
    if (chrome.runtime.lastError) {
      alert("Login failed: " + chrome.runtime.lastError.message);
      return;
    }
    
    fetch('https://www.googleapis.com/oauth2/v1/userinfo?alt=json&access_token=' + token)
      .then(response => response.json())
      .then(userInfo => {
        currentUserEmail = userInfo.email;
        document.getElementById('login-btn').style.display = 'none';
        document.getElementById('user-profile').style.display = 'flex';
        document.getElementById('user-email').innerText = userInfo.name;
        document.getElementById('user-avatar').src = userInfo.picture;
        document.getElementById('view-history-btn').style.display = 'block';
      });
  });
};

document.getElementById('logout-btn').onclick = () => {
  currentUserEmail = null;
  document.getElementById('login-btn').style.display = 'block';
  document.getElementById('user-profile').style.display = 'none';
  document.getElementById('view-history-btn').style.display = 'none';
};

function saveEmailToHistory(emailText) {
  if (!currentUserEmail) return; 
  const storageKey = `history_${currentUserEmail}`;
  chrome.storage.local.get([storageKey], function(result) {
    let history = result[storageKey] || [];
    history.unshift({ text: emailText, date: new Date().toLocaleDateString() }); 
    chrome.storage.local.set({ [storageKey]: history });
  });
}

document.getElementById("generate").onclick = async () => {
  const name = document.getElementById("name").value;
  const desc = document.getElementById("desc").value;
  const tone = document.getElementById("tone").value;
  
  const slider = document.getElementById("slider");
  const outputContainer = document.getElementById("output-container");
  const generateBtn = document.getElementById("generate");

  if (!name || !desc) {
    alert("Please fill in both fields."); return;
  }

  generateBtn.disabled = true; 
  generateBtn.innerText = "⏳ Generating... Please wait";

  try {
    const res = await fetch(`${SERVER_URL}/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, desc, tone })
    });

    if (!res.ok) throw new Error("Server Error");
    
    const data = await res.json();
    const emailsArray = data.result; 

    outputContainer.innerHTML = ""; 
    slider.classList.add("show-results");

    // THIS IS THE FIXED SECTION THAT HANDLES THE JSON OBJECTS
    emailsArray.forEach((emailObj) => {
        const fullText = "Subject: " + emailObj.subject + "\n\n" + emailObj.body;
        saveEmailToHistory(fullText);
        const cardUI = createNewCardUI(outputContainer, fullText, emailObj.subject, emailObj.body);
        typeOutText(cardUI.textDiv, fullText, 10);
    });

    generateBtn.disabled = false;
    generateBtn.innerText = "Generate Emails";

  } catch (err) {
    generateBtn.disabled = false;
    generateBtn.innerText = "Generate Emails";
    alert("Error: " + err.message);
  }
};

function typeOutText(element, fullText, speed) {
    let i = 0;
    element.innerText = "";
    function type() {
        if (i < fullText.length) {
            element.innerText += fullText.charAt(i);
            i++;
            setTimeout(type, speed);
        }
    }
    type();
}

function createNewCardUI(container, fullText, rawSubject, rawBody) {
  const card = document.createElement("div");
  card.className = "email-card";
  const textDiv = document.createElement("div");
  textDiv.className = "email-text";
  const copyWrapper = document.createElement("div");
  copyWrapper.className = "copy-wrapper";

  const gmailBtn = document.createElement("button");
  gmailBtn.className = "action-btn";
  gmailBtn.innerText = "📤 Draft in Gmail";
  gmailBtn.onclick = () => {
    window.open(`https://mail.google.com/mail/?view=cm&fs=1&su=${encodeURIComponent(rawSubject)}&body=${encodeURIComponent(rawBody)}`, '_blank');
  };

  const copyBtn = document.createElement("button");
  copyBtn.className = "action-btn";
  copyBtn.innerText = "📋 Copy";
  copyBtn.onclick = () => { 
      navigator.clipboard.writeText(fullText); 
      copyBtn.innerText = "✅ Copied!"; 
      copyBtn.classList.add("success");
      setTimeout(() => { copyBtn.innerText = "📋 Copy"; copyBtn.classList.remove("success"); }, 2000); 
  };

  copyWrapper.appendChild(gmailBtn);
  copyWrapper.appendChild(copyBtn);
  card.appendChild(textDiv);
  card.appendChild(copyWrapper);
  container.appendChild(card);
  return { card, textDiv }; 
}

document.getElementById("back-btn").onclick = () => {
  document.getElementById("slider").classList.remove("show-results");
};

document.getElementById("history-back-btn").onclick = () => {
  document.getElementById("slider").classList.remove("show-history");
};

document.getElementById('view-history-btn').onclick = () => {
  const historyContainer = document.getElementById("history-container");
  historyContainer.innerHTML = ""; 
  const storageKey = `history_${currentUserEmail}`;
  chrome.storage.local.get([storageKey], function(result) {
    let history = result[storageKey] || [];
    if (history.length === 0) {
      historyContainer.innerHTML = "<p style='text-align:center; color:#aaa; font-size:12px; margin-top: 20px;'>No saved emails.</p>";
    } else {
      history.forEach(item => {
        const card = document.createElement("div");
        card.className = "email-card";
        const dateStr = document.createElement("p");
        dateStr.style.cssText = "font-size:10px; color:#9ca3af; margin:0 0 8px 0; font-weight: bold;";
        dateStr.innerText = `Generated on: ${item.date}`;
        const textDiv = document.createElement("div");
        textDiv.className = "email-text";
        textDiv.innerText = item.text;
        const copyWrapper = document.createElement("div");
        copyWrapper.className = "copy-wrapper";
        const copyBtn = document.createElement("button");
        copyBtn.className = "action-btn";
        copyBtn.innerText = "📋 Copy";
        copyBtn.onclick = () => {
            navigator.clipboard.writeText(item.text); 
            copyBtn.innerText = "✅ Copied!"; 
            copyBtn.classList.add("success");
            setTimeout(() => { copyBtn.innerText = "📋 Copy"; copyBtn.classList.remove("success"); }, 2000); 
        };
        copyWrapper.appendChild(copyBtn);
        card.appendChild(dateStr);
        card.appendChild(textDiv);
        card.appendChild(copyWrapper);
        historyContainer.appendChild(card);
      });
    }
    document.getElementById("slider").classList.add("show-history");
  });
};
