import React, { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { FiSend, FiPaperclip, FiPlus, FiMenu, FiX, FiCopy, FiRefreshCw, FiSun, FiMoon, FiLogOut, FiImage, FiFileText, FiTrash2 } from "react-icons/fi";
import * as pdfjsLib from "pdfjs-dist";
import { db } from "../../firebase";
import { collection, doc, setDoc, getDocs, deleteDoc, query, orderBy } from "firebase/firestore";

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

const BACKEND_URL = "https://ai-doubt-solver-backend.onrender.com";

export default function ChatBox({ user, onLogout }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth > 768);
  const [imagePreview, setImagePreview] = useState(null);
  const [pdfText, setPdfText] = useState(null);
  const [pdfName, setPdfName] = useState(null);
  const [uploadType, setUploadType] = useState(null);
  const [showUploadMenu, setShowUploadMenu] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [activeChatId, setActiveChatId] = useState(null);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [copiedId, setCopiedId] = useState(null);
  const bottomRef = useRef(null);
  const chatAreaRef = useRef(null);
  const textareaRef = useRef(null);
  const imageInputRef = useRef(null);
  const pdfInputRef = useRef(null);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (!mobile) setSidebarOpen(true);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
  const chatArea = chatAreaRef.current;
  if (!chatArea) return;
  const isAtBottom = chatArea.scrollHeight - chatArea.scrollTop - chatArea.clientHeight < 100;
  if (isAtBottom) {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }
}, [messages, loading]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 160) + "px";
    }
  }, [input]);

  useEffect(() => {
    const loadHistory = async () => {
      setHistoryLoading(true);
      try {
        const q = query(
          collection(db, "users", user.uid, "chats"),
          orderBy("updatedAt", "desc")
        );
        const snap = await getDocs(q);
        const chats = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setChatHistory(chats);
        localStorage.setItem(`chat_history_${user.uid}`, JSON.stringify(chats));
      } catch (err) {
        const local = localStorage.getItem(`chat_history_${user.uid}`);
        if (local) setChatHistory(JSON.parse(local));
      }
      setHistoryLoading(false);
    };
    loadHistory();
  }, [user.uid]);

  const saveChat = async (chatId, title, msgs) => {
    const chatData = { id: chatId, title, messages: msgs, updatedAt: Date.now() };
    setChatHistory(prev => {
      const exists = prev.find(c => c.id === chatId);
      const updated = exists ? prev.map(c => c.id === chatId ? chatData : c) : [chatData, ...prev];
      localStorage.setItem(`chat_history_${user.uid}`, JSON.stringify(updated));
      return updated;
    });
    try {
      await setDoc(doc(db, "users", user.uid, "chats", chatId), chatData);
    } catch (err) { console.warn("Firebase save failed:", err); }
  };

  const deleteChat = async (chatId, e) => {
    e.stopPropagation();
    setChatHistory(prev => {
      const updated = prev.filter(c => c.id !== chatId);
      localStorage.setItem(`chat_history_${user.uid}`, JSON.stringify(updated));
      return updated;
    });
    if (activeChatId === chatId) { setMessages([]); setActiveChatId(null); }
    try { await deleteDoc(doc(db, "users", user.uid, "chats", chatId)); } catch (err) {}
  };

  const loadChat = (chat) => {
    setMessages(chat.messages || []);
    setActiveChatId(chat.id);
    clearUpload();
    setInput("");
    if (isMobile) setSidebarOpen(false);
  };

  const handleImage = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImagePreview(URL.createObjectURL(file));
      setPdfText(null);
      setPdfName(null);
      setUploadType("image");
      setShowUploadMenu(false);
    }
  };

  const handlePdf = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setShowUploadMenu(false);
    setPdfName(file.name);
    setUploadType("pdf");
    setImagePreview(null);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = "";
      for (let i = 1; i <= Math.min(pdf.numPages, 10); i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const pageText = content.items.map(item => item.str).join(" ");
        fullText += `\n[Page ${i}]: ${pageText}`;
      }
      setPdfText(fullText);
    } catch (err) {
      console.error("PDF Error:", err);
      setPdfText("Could not read PDF. Please try another file.");
    }
  };

  const clearUpload = () => {
    setImagePreview(null);
    setPdfText(null);
    setPdfName(null);
    setUploadType(null);
  };

  const askDoubt = async (overrideInput) => {
    const q = overrideInput || input;
    if (!q.trim() && !imagePreview && !pdfText) return;

    const userMsg = { role: "user", text: q, image: imagePreview, pdfName };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    clearUpload();
    setLoading(true);

    const chatId = activeChatId || `chat_${Date.now()}`;
    if (!activeChatId) setActiveChatId(chatId);
    const chatTitle = q.slice(0, 45) || pdfName || "Image question";

    try {
      let messages_payload;

      if (imagePreview) {
        const base64 = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          fetch(imagePreview)
            .then(r => r.blob())
            .then(blob => reader.readAsDataURL(blob));
        });
        messages_payload = [
          {
            role: "system",
            content: `You are an expert AI tutor. You help students with all academic subjects. The student uploaded an image of a question. Read it carefully and give a clear step-by-step solution. Use markdown formatting.`
          },
          {
            role: "user",
            content: [
              { type: "image_url", image_url: { url: base64 } },
              { type: "text", text: q || "Please solve this question from the image step by step" }
            ]
          }
        ];
      } else if (pdfText) {
        messages_payload = [
          {
            role: "system",
            content: `You are an expert AI tutor. You help students with all academic subjects. The student has uploaded a PDF document. Here is the extracted text:\n\n${pdfText}\n\nAnswer the student's question based on this PDF content. Use markdown formatting.`
          },
          {
            role: "user",
            content: q || "Please summarize this PDF and explain the key concepts"
          }
        ];
      } else {
        messages_payload = [
          {
            role: "system",
            content: `You are an expert AI tutor. You help students with all academic subjects. Give clear, step-by-step explanations with examples. Use markdown formatting.`
          },
          {
            role: "user",
            content: q
          }
        ];
      }

      const endpoint = imagePreview ? `${BACKEND_URL}/api/ask-vision` : `${BACKEND_URL}/api/ask`;
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: messages_payload }),
      });

      const data = await response.json();
      const aiText = data.text;
      const msgId = Date.now();

      // ✅ Smooth word-by-word reveal (professional, not annoying)
      setMessages((prev) => [...prev, { role: "ai", text: "", fullText: aiText, id: msgId, typing: true }]);
      const words = aiText.split(" ");
      let wordIndex = 0;
      const interval = setInterval(() => {
        wordIndex += 3;
        const currentText = words.slice(0, wordIndex).join(" ");
        setMessages((prev) =>
          prev.map((m) =>
            m.id === msgId ? { ...m, text: currentText } : m
          )
        );
        if (wordIndex >= words.length) {
          clearInterval(interval);
          setMessages(prev => {
            const finalMsgs = prev.map(m =>
              m.id === msgId ? { ...m, text: aiText, typing: false } : m
            );
            saveChat(chatId, chatTitle, finalMsgs);
            return finalMsgs;
          });
        }
      }, 30);

    } catch (error) {
      console.log("ERROR:", error);
      setMessages((prev) => [...prev, { role: "ai", text: "Something went wrong. Please try again.", id: Date.now() }]);
    }
    setLoading(false);
  };

  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const d = darkMode;
  const bg = d ? "#0f0f0f" : "#f7f8fc";
  const sidebar = d ? "#141414" : "#ffffff";
  const card = d ? "#1a1a1a" : "#ffffff";
  const border = d ? "#2a2a2a" : "#e5e7eb";
  const text = d ? "#f0f0f0" : "#1a1a1a";
  const muted = d ? "#888" : "#6b7280";
  const inputBg = d ? "#1e1e1e" : "#f3f4f6";
  const userBubble = "linear-gradient(135deg, #667eea, #764ba2)";
  const aiBubble = d ? "#1e1e1e" : "#ffffff";

  return (
    <div style={{ display: "flex", height: "100vh", background: bg, color: text, fontFamily: "'Inter', sans-serif", overflow: "hidden", transition: "all 0.3s" }}>

      {isMobile && sidebarOpen && (
        <div onClick={() => setSidebarOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 10 }} />
      )}

      {/* Sidebar */}
      <div style={{
        width: 260, minWidth: 260,
        background: sidebar,
        borderRight: `1px solid ${border}`,
        display: "flex", flexDirection: "column",
        overflow: "hidden",
        transition: "all 0.3s ease",
        ...(isMobile ? {
          position: "fixed", top: 0, left: 0, height: "100vh", zIndex: 20,
          transform: sidebarOpen ? "translateX(0)" : "translateX(-100%)",
        } : {
          width: sidebarOpen ? 260 : 0,
          minWidth: sidebarOpen ? 260 : 0,
        })
      }}>
        <div style={{ padding: "16px", borderBottom: `1px solid ${border}` }}>
          <button onClick={() => { setMessages([]); setInput(""); clearUpload(); setActiveChatId(null); if (isMobile) setSidebarOpen(false); }}
            style={{ width: "100%", padding: "10px 14px", background: "linear-gradient(135deg, #667eea, #764ba2)", color: "white", border: "none", borderRadius: 10, cursor: "pointer", fontWeight: 600, fontSize: 14, display: "flex", alignItems: "center", gap: 8, justifyContent: "center" }}>
            <FiPlus size={16} /> New Chat
          </button>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "12px 8px" }}>
          <div style={{ fontSize: 11, color: muted, marginBottom: 8, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1, padding: "0 8px" }}>Recent</div>
          {historyLoading ? (
            <div style={{ padding: "20px", textAlign: "center", color: muted, fontSize: 13 }}>Loading...</div>
          ) : chatHistory.length === 0 ? (
            <div style={{ padding: "20px", textAlign: "center", color: muted, fontSize: 13 }}>No chats yet</div>
          ) : chatHistory.map(chat => (
            <div key={chat.id} onClick={() => loadChat(chat)}
              style={{ padding: "10px 12px", borderRadius: 8, cursor: "pointer", fontSize: 13, color: activeChatId === chat.id ? text : muted, background: activeChatId === chat.id ? (d ? "#2a2a2a" : "#f3f4f6") : "transparent", marginBottom: 2, display: "flex", alignItems: "center", gap: 8, transition: "background 0.2s" }}
              onMouseEnter={e => { if (activeChatId !== chat.id) e.currentTarget.style.background = d ? "#1f1f1f" : "#f9fafb"; }}
              onMouseLeave={e => { if (activeChatId !== chat.id) e.currentTarget.style.background = "transparent"; }}>
              <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>💬 {chat.title}</span>
              <button onClick={(e) => deleteChat(chat.id, e)}
                style={{ background: "none", border: "none", cursor: "pointer", color: muted, padding: 2, display: "flex", alignItems: "center" }}
                onMouseEnter={e => e.currentTarget.style.color = "#e74c3c"}
                onMouseLeave={e => e.currentTarget.style.color = muted}>
                <FiTrash2 size={13} />
              </button>
            </div>
          ))}
        </div>

        <div style={{ padding: "12px 16px", borderTop: `1px solid ${border}`, display: "flex", alignItems: "center", gap: 10 }}>
          <img src={user.photoURL} alt="profile" style={{ width: 34, height: 34, borderRadius: "50%" }} />
          <div style={{ flex: 1, overflow: "hidden" }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user.displayName}</div>
            <div style={{ fontSize: 11, color: muted }}>Free Plan</div>
          </div>
          <button onClick={onLogout} title="Logout" style={{ background: "none", border: "none", cursor: "pointer", color: muted, padding: 4 }}>
            <FiLogOut size={16} />
          </button>
        </div>
      </div>

      {/* Main Chat Area */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", minWidth: 0 }}>
        <div style={{ padding: isMobile ? "12px 14px" : "14px 20px", borderBottom: `1px solid ${border}`, display: "flex", alignItems: "center", gap: 12, background: card }}>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} style={{ background: "none", border: "none", cursor: "pointer", color: muted, padding: 4, flexShrink: 0 }}>
            {sidebarOpen && !isMobile ? <FiX size={20} /> : <FiMenu size={20} />}
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <span style={{ fontWeight: 700, fontSize: isMobile ? 14 : 16, background: "linear-gradient(135deg, #667eea, #764ba2)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>🎓 AI Doubt Solver</span>
          </div>
          <button onClick={() => setDarkMode(!darkMode)} style={{ background: "none", border: "none", cursor: "pointer", color: muted, padding: 4, flexShrink: 0 }}>
            {darkMode ? <FiSun size={18} /> : <FiMoon size={18} />}
          </button>
        </div>

        <div ref={chatAreaRef} style={{ flex: 1, overflowY: "auto", padding: isMobile ? "16px 12px" : "24px 20px", display: "flex", flexDirection: "column", gap: 16 }}>
          {messages.length === 0 && (
            <div style={{ textAlign: "center", marginTop: isMobile ? "8vh" : "15vh", padding: "0 12px" }}>
              <div style={{ fontSize: isMobile ? 36 : 48, marginBottom: 12 }}>🎓</div>
              <div style={{ fontSize: isMobile ? 20 : 24, fontWeight: 700, marginBottom: 8, background: "linear-gradient(135deg, #667eea, #764ba2)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>AI Doubt Solver</div>
              <div style={{ color: muted, fontSize: isMobile ? 13 : 15, marginBottom: 8 }}>Ask any question and get step-by-step explanations</div>
              <div style={{ color: muted, fontSize: 12, marginBottom: 20 }}>📷 Upload an image or 📄 PDF of your question!</div>
              <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", padding: "0 8px" }}>
                {["What is integration?", "Explain Newton's 3rd law", "How does DNA replication work?"].map(q => (
                  <button key={q} onClick={() => askDoubt(q)}
                    style={{ padding: "8px 14px", borderRadius: 20, border: `1px solid ${border}`, background: "transparent", color: muted, fontSize: isMobile ? 12 : 13, cursor: "pointer", transition: "all 0.2s" }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = "#667eea"; e.currentTarget.style.color = "#667eea"; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = border; e.currentTarget.style.color = muted; }}>
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: msg.role === "user" ? "flex-end" : "flex-start", animation: "fadeIn 0.3s ease" }}>
              {msg.role === "user" ? (
                <div style={{ maxWidth: isMobile ? "88%" : "70%", padding: "10px 14px", borderRadius: "18px 18px 4px 18px", background: userBubble, color: "white", fontSize: isMobile ? 14 : 15, lineHeight: 1.6 }}>
                  {msg.image && <img src={msg.image} alt="uploaded" style={{ maxWidth: "100%", borderRadius: 8, marginBottom: 8 }} />}
                  {msg.pdfName && (
                    <div style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.2)", padding: "6px 10px", borderRadius: 8, marginBottom: 8, fontSize: 12 }}>
                      <FiFileText size={13} /> {msg.pdfName}
                    </div>
                  )}
                  {msg.text}
                </div>
              ) : (
                <div style={{ maxWidth: isMobile ? "95%" : "80%", width: "100%" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <div style={{ width: 26, height: 26, borderRadius: "50%", background: "linear-gradient(135deg, #667eea, #764ba2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, flexShrink: 0 }}>🤖</div>
                    <span style={{ fontSize: 12, fontWeight: 600, color: text }}>AI Tutor</span>
                  </div>
                  <div style={{ padding: isMobile ? "12px 14px" : "16px 20px", borderRadius: "4px 18px 18px 18px", background: aiBubble, border: `1px solid ${border}`, fontSize: isMobile ? 14 : 15, lineHeight: 1.8, color: text, overflowX: "auto" }}>
                    <ReactMarkdown
                      remarkPlugins={[remarkMath]}
                      rehypePlugins={[rehypeKatex]}
                      components={{
                        code({ inline, className, children }) {
                          const lang = /language-(\w+)/.exec(className || "")?.[1];
                          return !inline && lang ? (
                            <SyntaxHighlighter style={oneDark} language={lang} PreTag="div">
                              {String(children).replace(/\n$/, "")}
                            </SyntaxHighlighter>
                          ) : (
                            <code style={{ background: d ? "#2a2a2a" : "#f3f4f6", padding: "2px 6px", borderRadius: 4, fontSize: 13 }}>
                              {children}
                            </code>
                          );
                        }
                      }}
                    >
                      {msg.text}
                    </ReactMarkdown>
                  </div>
                  <div style={{ display: "flex", gap: 6, marginTop: 6 }}>
                    <button onClick={() => handleCopy(msg.text, msg.id)}
                      style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 6, border: `1px solid ${border}`, background: "transparent", color: muted, fontSize: 12, cursor: "pointer" }}>
                      <FiCopy size={12} /> {copiedId === msg.id ? "Copied!" : "Copy"}
                    </button>
                    <button onClick={() => askDoubt(messages.findLast(m => m.role === "user")?.text)}
                      style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", borderRadius: 6, border: `1px solid ${border}`, background: "transparent", color: muted, fontSize: 12, cursor: "pointer" }}>
                      <FiRefreshCw size={12} /> Regenerate
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 26, height: 26, borderRadius: "50%", background: "linear-gradient(135deg, #667eea, #764ba2)", display: "flex", alignItems: "center", justifyContent: "center" }}>🤖</div>
              <div style={{ padding: "12px 18px", borderRadius: "4px 18px 18px 18px", background: aiBubble, border: `1px solid ${border}` }}>
                <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: "#667eea", animation: `bounce 1s ease infinite ${i * 0.2}s` }} />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input Area */}
        <div style={{ padding: isMobile ? "10px 12px" : "16px 20px", borderTop: `1px solid ${border}`, background: card }}>
          {imagePreview && (
            <div style={{ marginBottom: 8, position: "relative", display: "inline-block" }}>
              <img src={imagePreview} alt="preview" style={{ maxHeight: 80, borderRadius: 10, border: `2px solid ${border}` }} />
              <button onClick={clearUpload} style={{ position: "absolute", top: -8, right: -8, width: 22, height: 22, borderRadius: "50%", background: "#e74c3c", color: "white", border: "none", cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
            </div>
          )}

          {pdfName && (
            <div style={{ marginBottom: 8, display: "inline-flex", alignItems: "center", gap: 8, background: d ? "#2a2a2a" : "#f3f4f6", padding: "6px 10px", borderRadius: 10, border: `1px solid ${border}`, maxWidth: "100%" }}>
              <FiFileText size={14} color="#667eea" style={{ flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: text, maxWidth: isMobile ? 120 : 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{pdfName}</span>
              {pdfText ? <span style={{ fontSize: 11, color: "#4caf50", flexShrink: 0 }}>✓</span> : <span style={{ fontSize: 11, color: muted }}>...</span>}
              <button onClick={clearUpload} style={{ background: "none", border: "none", cursor: "pointer", color: muted, display: "flex", alignItems: "center", flexShrink: 0 }}>✕</button>
            </div>
          )}

          <div style={{ position: "relative", display: "inline-block" }}>
            {showUploadMenu && (
              <div style={{ position: "absolute", bottom: "100%", left: 0, marginBottom: 8, background: card, border: `1px solid ${border}`, borderRadius: 12, padding: 8, display: "flex", flexDirection: "column", gap: 4, zIndex: 100, minWidth: 160, boxShadow: "0 4px 20px rgba(0,0,0,0.3)" }}>
                <button onClick={() => imageInputRef.current.click()}
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 8, border: "none", background: "transparent", color: text, cursor: "pointer", fontSize: 13, fontWeight: 500 }}
                  onMouseEnter={e => e.currentTarget.style.background = d ? "#2a2a2a" : "#f3f4f6"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  <FiImage size={16} color="#667eea" /> Upload Image
                </button>
                <button onClick={() => pdfInputRef.current.click()}
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 8, border: "none", background: "transparent", color: text, cursor: "pointer", fontSize: 13, fontWeight: 500 }}
                  onMouseEnter={e => e.currentTarget.style.background = d ? "#2a2a2a" : "#f3f4f6"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}>
                  <FiFileText size={16} color="#667eea" /> Upload PDF
                </button>
              </div>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "flex-end", gap: 8, background: inputBg, borderRadius: 14, padding: isMobile ? "8px 10px" : "10px 14px", border: `1px solid ${border}` }}>
            <button onClick={() => setShowUploadMenu(!showUploadMenu)}
              style={{ cursor: "pointer", color: uploadType ? "#667eea" : muted, padding: "4px", display: "flex", alignItems: "center", background: "none", border: "none", flexShrink: 0 }}>
              <FiPaperclip size={18} />
            </button>
            <input ref={imageInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleImage} />
            <input ref={pdfInputRef} type="file" accept=".pdf" style={{ display: "none" }} onChange={handlePdf} />
            <textarea
              ref={textareaRef}
              rows={1}
              style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: text, fontSize: isMobile ? 14 : 15, resize: "none", lineHeight: 1.6, maxHeight: 120, fontFamily: "inherit", minWidth: 0 }}
              placeholder={pdfName ? `Ask about ${pdfName}...` : `Ask your doubt here...`}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey && !isMobile) { e.preventDefault(); askDoubt(); setShowUploadMenu(false); } }}
            />
            <button onClick={() => { askDoubt(); setShowUploadMenu(false); }}
              disabled={loading || (!input.trim() && !imagePreview && !pdfText)}
              style={{ padding: isMobile ? "8px 12px" : "8px 16px", borderRadius: 10, background: (input.trim() || imagePreview || pdfText) ? "linear-gradient(135deg, #667eea, #764ba2)" : border, color: "white", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: isMobile ? 0 : 6, fontSize: 14, fontWeight: 600, transition: "all 0.2s", flexShrink: 0 }}>
              <FiSend size={16} />
              {!isMobile && " Ask"}
            </button>
          </div>
          {!isMobile && <div style={{ textAlign: "center", fontSize: 11, color: muted, marginTop: 8 }}>Press Enter to send • Shift+Enter for new line • 📎 for image or PDF</div>}
        </div>
      </div>

      <style>{`
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #444; border-radius: 4px; }
      `}</style>
    </div>
  );
}