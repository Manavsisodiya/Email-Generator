const SERVER_URL = "https://email-generator-api-epbf.onrender.com"; 
let currentUserEmail = null;

document.getElementById('login-btn').onclick = () => {
  chrome.identity.getAuthToken({ interactive: true }, function(token) {
    if (chrome.runtime.lastError) {
      alert("Login failed: " + chrome.runtime.lastError.message);
      return;
    }
    
    // Fetch user details from Google
    fetch('https://www.googleapis.com/oauth2/v1/userinfo?alt=json&access_token=' + token)
      .then(response => response.json())
      .then(userInfo => {
        currentUserEmail = userInfo.email;
        
        // Update UI to show logged-in state
        document.getElementById('login-btn').style.display = 'none';
        document.getElementById('user-profile').style.display = 'flex';
        document.getElementById('user-email').innerText = userInfo.name;
        document.getElementById('user-avatar').src = userInfo.picture;
        document.getElementById('view-history-btn').style.display = 'block';
      })
      .catch(err => {
          console.error("Error fetching user info:", err);
          alert("Could not load user profile.");
      });
  });
};

document.getElementById('logout-btn').onclick = () => {
  // Reset local state to visually log the user out
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
    
    // Add the new email to the front of the array with today's date
    history.unshift({ 
        text: emailText, 
        date: new Date().toLocaleDateString() 
    }); 
    
    // Save it back to Chrome Storage
    chrome.storage.local.set({ [storageKey]: history });
  });
}


// --- 3. EMAIL GENERATION LOGIC (STREAMING) ---
document.getElementById("generate").onclick = async () => {
  const name = document.getElementById("name").value;
  const desc = document.getElementById("desc").value;
  const tone = document.getElementById("tone").value;
  
  const slider = document.getElementById("slider");
  const outputContainer = document.getElementById("output-container");
  const generateBtn = document.getElementById("generate");

  if (!name || !desc) {
    alert("Please fill in both the Receiver Name and Description fields."); return;
  }

  generateBtn.disabled = true; 
  generateBtn.innerText = "⏳ Connecting...";
  outputContainer.innerHTML = ""; 
  slider.classList.add("show-results"); // Slide over immediately!

  try {
    // Notice we are calling /stream now
    const res = await fetch(`${SERVER_URL}/stream`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, desc, tone })
    });

    if (!res.ok) throw new Error(`Server status: ${res.status}`);

    generateBtn.innerText = "✨ Generating...";

    // --- STREAM PARSING LOGIC ---
    const reader = res.body.getReader();
    const decoder = new TextDecoder("utf-8");
    
    let currentEmailText = "";
    let currentCard = createNewCardUI(outputContainer); // Helper function below
    let allGeneratedEmails = []; // Store them to save to history later

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      let chunk = decoder.decode(value, { stream: true });
      chunk = chunk.replace(/\*\*/g, '').replace(/###/g, ''); // Clean markdown

      // Check if this chunk contains our delimiter
      if (chunk.includes('|||')) {
        const parts = chunk.split('|||');
        
        // Finish the current card
        currentEmailText += parts[0];
        currentCard.textDiv.innerText = currentEmailText.trim();
        allGeneratedEmails.push(currentEmailText.trim());
        
        // Create the next card for the remaining text
        currentCard = createNewCardUI(outputContainer);
        currentEmailText = parts[1] || "";
        currentCard.textDiv.innerText = currentEmailText;
        
      } else {
        // Just append text to the current card
        currentEmailText += chunk;
        currentCard.textDiv.innerText = currentEmailText.trim();
      }
    }

    // When the stream finishes, save the very last email in the buffer
    if (currentEmailText.trim().length > 0) {
        allGeneratedEmails.push(currentEmailText.trim());
    }

    // Save all to History 
    allGeneratedEmails.forEach(email => saveEmailToHistory(email));

    // Reset button
    generateBtn.disabled = false;
    generateBtn.innerText = "Generate Emails";

  } catch (err) {
    generateBtn.disabled = false;
    generateBtn.innerText = "Generate Emails";
    console.error("Streaming Error:", err);
    alert(`System Error: ${err.message}`);
  }
};

// --- HELPER FUNCTION TO BUILD CARDS DYNAMICALLY ---
function createNewCardUI(container) {
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
    let subject = "New Email";
    let bodyText = textDiv.innerText; // Pull directly from the DOM
    const subjectMatch = bodyText.match(/Subject:\s*(.*)/i);
    if (subjectMatch) { 
        subject = subjectMatch[1].trim(); 
        bodyText = bodyText.replace(subjectMatch[0], '').trim(); 
    }
    bodyText = bodyText.replace(/^Body:\s*/i, '').trim();
    window.open(`https://mail.google.com/mail/?view=cm&fs=1&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(bodyText)}`, '_blank');
  };

  const copyBtn = document.createElement("button");
  copyBtn.className = "action-btn";
  copyBtn.innerText = "📋 Copy";
  copyBtn.onclick = () => { 
      navigator.clipboard.writeText(textDiv.innerText); 
      copyBtn.innerText = "✅ Copied!"; 
      copyBtn.classList.add("success");
      setTimeout(() => { copyBtn.innerText = "📋 Copy"; copyBtn.classList.remove("success"); }, 2000); 
  };

  copyWrapper.appendChild(gmailBtn);
  copyWrapper.appendChild(copyBtn);
  card.appendChild(textDiv);
  card.appendChild(copyWrapper);
  container.appendChild(card);
  
  return { card, textDiv }; // Return the text div so the stream can inject text into it
}

// --- 4. NAVIGATION & HISTORY RENDERING ---
document.getElementById("back-btn").onclick = () => {
  document.getElementById("slider").classList.remove("show-results");
};

document.getElementById("history-back-btn").onclick = () => {
  document.getElementById("slider").classList.remove("show-history");
};

// Load and Display the History Screen
document.getElementById('view-history-btn').onclick = () => {
  const historyContainer = document.getElementById("history-container");
  historyContainer.innerHTML = ""; // Clear old view
  
  const storageKey = `history_${currentUserEmail}`;
  chrome.storage.local.get([storageKey], function(result) {
    let history = result[storageKey] || [];
    
    if (history.length === 0) {
      historyContainer.innerHTML = "<p style='text-align:center; color:#aaa; font-size:12px; margin-top: 20px;'>No saved emails yet!<br>Generate some to see them here.</p>";
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
        
        // Add a simple copy button for history items too
        const copyWrapper = document.createElement("div");
        copyWrapper.className = "copy-wrapper";
        
        const copyBtn = document.createElement("button");
        copyBtn.className = "action-btn";
        copyBtn.innerText = "📋 Copy";
        copyBtn.onclick = () => {
            navigator.clipboard.writeText(item.text); 
            copyBtn.innerText = "✅ Copied!"; 
            copyBtn.classList.add("success");
            setTimeout(() => {
                copyBtn.innerText = "📋 Copy";
                copyBtn.classList.remove("success");
            }, 2000); 
        };
        
        copyWrapper.appendChild(copyBtn);
        
        card.appendChild(dateStr);
        card.appendChild(textDiv);
        card.appendChild(copyWrapper);
        historyContainer.appendChild(card);
      });
    }
    
    // Slide to the History view
    document.getElementById("slider").classList.add("show-history");
  });
};