// ফেসবুক পেজ কমেন্ট AI অটো-রিপ্লাই বট
// এই ৪টা তথ্য Render.com এর Environment Variables এ বসাবে (কোডে সরাসরি বসাবে না)

const express = require("express");
const app = express();
app.use(express.json());

const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const PAGE_ID = process.env.PAGE_ID;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const VERIFY_TOKEN = process.env.VERIFY_TOKEN;

// একই কমেন্টে দুইবার রিপ্লাই ঠেকানোর জন্য মেমোরিতে রাখা তালিকা
const repliedComments = new Set();

// একদম বেসিক স্প্যাম/গালি ফিল্টার — প্রয়োজনমতো শব্দ যোগ করতে পারো
const blockedWords = ["spam", "scam"];

// ধাপ ১: Facebook Webhook Verification (GET রিকোয়েস্ট)
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("Webhook verified successfully.");
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

// ধাপ ২: নতুন কমেন্ট এলে Facebook এখানে POST করবে
app.post("/webhook", async (req, res) => {
  // ফেসবুককে সাথে সাথে জানাও যে রিকোয়েস্ট পেয়েছি (নাহলে ফেসবুক বারবার পাঠাতে থাকবে)
  res.status(200).send("EVENT_RECEIVED");

  try {
    const entries = req.body.entry || [];

    for (const entry of entries) {
      const changes = entry.changes || [];

      for (const change of changes) {
        if (change.field !== "feed") continue;
        const value = change.value;

        // শুধু নতুন কমেন্ট ইভেন্ট নিয়ে কাজ করবো, রিপ্লাই/লাইক/এডিট বাদ
        if (value.item !== "comment" || value.verb !== "add") continue;

        const commentId = value.comment_id;
        const commentText = value.message || "";
        const fromId = value.from ? value.from.id : null;

        // নিজের পেজের করা কমেন্টে রিপ্লাই দেওয়া বন্ধ (loop এড়াতে)
        if (fromId === PAGE_ID) continue;

        // ডুপ্লিকেট চেক
        if (repliedComments.has(commentId)) continue;

        // খারাপ শব্দ ফিল্টার
        const lowerText = commentText.toLowerCase();
        if (blockedWords.some((word) => lowerText.includes(word))) continue;

        // খালি কমেন্ট (শুধু ছবি/স্টিকার) বাদ
        if (!commentText.trim()) continue;

        repliedComments.add(commentId);

        const aiReply = await generateReply(commentText);
        if (aiReply) {
          await postReplyToFacebook(commentId, aiReply);
        }
      }
    }
  } catch (err) {
    console.error("Error processing webhook:", err);
  }
});

// Gemini API দিয়ে রিপ্লাই জেনারেট করা
async function generateReply(commentText) {
  const prompt = `তুমি একটি ফেসবুক পেজের কমেন্টের উত্তর দিচ্ছো। নিচের কমেন্টের ভাষাতেই (বাংলা হলে বাংলায়, ইংরেজি হলে ইংরেজিতে) একটি বন্ধুত্বপূর্ণ, সংক্ষিপ্ত (১-২ বাক্য), স্বাভাবিক ও প্রাসঙ্গিক রিপ্লাই লেখো। ইমোজি ব্যবহার করতে পারো, তবে বেশি নয়। শুধু রিপ্লাইটুকু লেখো, অন্য কিছু নয়।\n\nকমেন্ট: "${commentText}"`;

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
        }),
      }
    );

    const data = await response.json();
    const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;
    return reply ? reply.trim() : null;
  } catch (err) {
    console.error("Gemini API error:", err);
    return null;
  }
}

// Facebook Graph API দিয়ে কমেন্টে রিপ্লাই পোস্ট করা
async function postReplyToFacebook(commentId, message) {
  try {
    const response = await fetch(
      `https://graph.facebook.com/v19.0/${commentId}/comments`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: message,
          access_token: PAGE_ACCESS_TOKEN,
        }),
      }
    );

    const data = await response.json();
    if (data.error) {
      console.error("Facebook API error:", data.error);
    } else {
      console.log(`Replied to comment ${commentId}: ${message}`);
    }
  } catch (err) {
    console.error("Error posting reply:", err);
  }
}

// সার্ভার ঠিকঠাক চলছে কিনা চেক করার জন্য একটা সাধারণ পেজ
app.get("/", (req, res) => {
  res.send("Facebook Auto-Reply Bot is running.");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
