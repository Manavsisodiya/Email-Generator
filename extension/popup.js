const SERVER_URL = "https://email-generator-api-wl1l.onrender.com"; 

document.getElementById("generate").onclick = async () => {
  const name = document.getElementById("name").value;
  const desc = document.getElementById("desc").value;
  const tone = document.getElementById("tone").value;

  if (!name || !desc) {
    alert("Fill all fields");
    return;
  }

  document.getElementById("output").innerText = "Generating...";

  try {
    // We use the SERVER_URL variable here so it's easy to swap later
    const res = await fetch(`${SERVER_URL}/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ name, desc, tone })
    });

    if (!res.ok) {
        throw new Error(`Server responded with status: ${res.status}`);
    }

    const data = await res.json();
    
    // Check if the result exists before trying to display it
    if (data.result) {
        document.getElementById("output").innerText = data.result;
    } else {
        document.getElementById("output").innerText = "Error: Invalid response from server";
    }

  } catch (err) {
    document.getElementById("output").innerText = "Error: " + err.message;
  }
};