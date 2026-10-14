(function () {
  var form = document.getElementById("chat-form");
  var input = document.getElementById("message-input");
  var sendButton = document.getElementById("send-button");
  var messages = document.getElementById("messages");

  var sessionId = "airsense-" + Date.now() + "-" + Math.floor(Math.random() * 100000);

  function addMessage(text, sender) {
    var message = document.createElement("div");
    message.className = "message " + sender;

    var bubble = document.createElement("div");
    bubble.className = "bubble";
    bubble.textContent = text;

    message.appendChild(bubble);
    messages.appendChild(message);
    messages.scrollTop = messages.scrollHeight;
    return message;
  }

  function setBusy(busy) {
    sendButton.disabled = busy;
    input.disabled = busy;
  }

  async function sendMessage(text) {
    addMessage(text, "user");
    var pending = addMessage("Thinking...", "bot pending");
    setBusy(true);

    try {
      var response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, sessionId: sessionId }),
      });

      var data = await response.json();

      if (!response.ok) {
        throw new Error(data && data.error ? data.error : "Request failed");
      }

      pending.remove();
      addMessage(data.reply || "Sorry, I didn't get a response for that.", "bot");
    } catch (err) {
      console.error("Chat request failed:", err);
      pending.remove();
      addMessage("Sorry, I couldn't reach the assistant. Please try again.", "bot");
    } finally {
      setBusy(false);
      input.focus();
    }
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    var text = input.value.trim();
    if (!text) {
      return;
    }
    input.value = "";
    sendMessage(text);
  });
})();
