import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Send, Paperclip, X, File, Image, FileText, Video, Music, User, Bot, Loader, Copy, Flag, Check } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import axios from 'axios';
import './styles/chat.css'

// Typewriter effect component
const TypewriterText = ({ text, speed = 20, onComplete }) => {
  const [displayedText, setDisplayedText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (currentIndex < text.length) {
      const timer = setTimeout(() => {
        setDisplayedText(prev => prev + text[currentIndex]);
        setCurrentIndex(prev => prev + 1);
      }, speed);
      return () => clearTimeout(timer);
    } else if (onComplete) {
      onComplete();
    }
  }, [currentIndex, text, speed, onComplete]);

  useEffect(() => {
    setDisplayedText('');
    setCurrentIndex(0);
  }, [text]);

  return (
    <div className="typewriter-text">
      {displayedText}
      {currentIndex < text.length && <span className="cursor">|</span>}
    </div>
  );
};

// Format AI response text with proper markdown-like formatting
const formatAIResponse = (text) => {
  if (!text) return '';
  
  // Split text into lines to handle formatting better
  let lines = text.split('\n');
  let formatted = '';
  
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    
    // Handle headers first (ensure they're on their own lines)
    if (line.match(/^###\s+(.+)$/)) {
      formatted += `<h3>${line.replace(/^###\s+/, '')}</h3>\n`;
    } else if (line.match(/^##\s+(.+)$/)) {
      formatted += `<h2>${line.replace(/^##\s+/, '')}</h2>\n`;
    } else if (line.match(/^#\s+(.+)$/)) {
      formatted += `<h1>${line.replace(/^#\s+/, '')}</h1>\n`;
    } else {
      formatted += line + '\n';
    }
  }
  
  // Now handle other formatting
  formatted = formatted
    // Bold text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // Code blocks
    .replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // Unordered lists
    .replace(/^\* (.+$)/gim, '<li>$1</li>')
    // Ordered lists
    .replace(/^\d+\. (.+$)/gim, '<li>$1</li>')
    // Handle links with proper formatting [text](url) - BEFORE image processing
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

  // IMPROVED: Much more comprehensive and accurate image URL regex
  const imageRegex = /https?:\/\/[^\s<>"{}|\\^`[\]]*\.(jpg|jpeg|png|gif|webp|svg)(?:\?[^\s<>"{}|\\^`[\]]*)?/gi;

  // Find all image URLs first
  const images = [];
  let match;
  const regex = new RegExp(imageRegex);
  let tempText = formatted;
  
  while ((match = regex.exec(tempText)) !== null) {
    images.push(match[0]);
    tempText = tempText.substring(match.index + match[0].length);
  }

  // Remove duplicates
  const uniqueImages = [...new Set(images)];
  
  if (uniqueImages.length > 0) {
    // Remove image URLs from text (be more careful about context)
    uniqueImages.forEach(img => {
      // Only remove if it's a standalone URL, not part of a markdown link
      const standaloneImageRegex = new RegExp(`(?<!\\(|href="|src=")${img.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![^<]*>)`, 'g');
      formatted = formatted.replace(standaloneImageRegex, '');
    });
    
    // Create image grid with better error handling
    let imageGrid = '<div class="image-grid">';
    uniqueImages.forEach(img => {
      // Clean up URL parameters that might break image loading
      const cleanImg = img.replace(/(\?.*)?$/, (match) => {
        if (img.includes('unsplash.com')) {
          return match.includes('?') ? match + '&w=400&h=300&fit=crop' : '?w=400&h=300&fit=crop';
        }
        return match;
      });
      
      imageGrid += `<img src="${cleanImg}" alt="Related Image" loading="lazy" 
                     onclick="window.open('${cleanImg}', '_blank')" 
                     onerror="this.style.display='none'; console.log('Failed to load image: ${cleanImg}');" 
                     style="max-width: 300px; max-height: 200px; object-fit: cover; margin: 5px; border-radius: 8px; cursor: pointer;" />`;
    });
    imageGrid += '</div>';
    
    formatted = imageGrid + formatted;
  }
  
  // IMPROVED: Better URL detection for non-image links
  // This regex is more restrictive and won't catch image URLs or already formatted links
  const urlRegex = /(?<!href="|src="|<a[^>]*>)https?:\/\/(?:www\.)?[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z]{2,})+(?:\/[^\s<>"{}|\\^`[\]]*)?(?![^<]*<\/a>)(?!\.(jpg|jpeg|png|gif|webp|svg)(?:\?[^\s]*)?)/gi;
  
  formatted = formatted.replace(urlRegex, (url) => {
    // Double check it's not already in a link tag
    return `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`;
  });
  
  // Handle lists properly
  formatted = formatted.replace(/(<li>.*?<\/li>\s*)+/gs, (match) => {
    if (formatted.includes('1.') || formatted.includes('2.')) {
      return `<ol>${match}</ol>`;
    } else {
      return `<ul>${match}</ul>`;
    }
  });
  
  // Handle line breaks and paragraphs
  formatted = formatted
    .replace(/\n\n+/g, '</p><p>')
    .replace(/\n/g, '<br>');

  // Wrap in paragraph tags if needed
  if (!formatted.includes('<h1>') && !formatted.includes('<h2>') && !formatted.includes('<h3>') && 
      !formatted.includes('<p>') && !formatted.includes('<ul>') && !formatted.includes('<ol>')) {
    formatted = `<p>${formatted}</p>`;
  }

  return formatted;
};

// Message component with action buttons
const Message = ({ message, isTyping = false }) => {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);
  const [reported, setReported] = useState(false);
  
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(message.parts[0].text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const reportMessage = () => {
    setReported(true);
    setTimeout(() => setReported(false), 2000);
    // You can add actual reporting logic here
    console.log('Message reported:', message.parts[0].text);
  };
  
  return (
    <div className={`message ${isUser ? 'user-message' : 'ai-message'}`}>
      <div className="message-avatar">
        {isUser ? <User size={16} /> : <Bot size={16} />}
      </div>
      <div className="message-content">
        <div className="message-header">
          <span className="message-sender">{isUser ? 'You' : 'OrpheusAI'}</span>
          <span className="message-time">
            {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
        <div className="message-text">
          {message.hasFile && (
            <div className="message-file-indicator">
              <File size={14} />
              <span>Attached: {message.fileName}</span>
            </div>
          )}
          {isTyping && !isUser ? (
            <TypewriterText text={message.parts[0].text} speed={15} />
          ) : isUser ? (
            <div className="user-text-bubble">{message.parts[0].text}</div>
          ) : (
            <div 
              className="ai-formatted-text"
              dangerouslySetInnerHTML={{ __html: formatAIResponse(message.parts[0].text) }}
            />
          )}
        </div>
        
        {/* Action buttons for AI messages */}
        {!isUser && !isTyping && (
          <div className="message-actions">
            <button 
              className="action-icon-btn" 
              onClick={copyToClipboard}
              title="Copy response"
            >
              {copied ? <Check size={14} /> : <Copy size={14} />}
            </button>
            <button 
              className="action-icon-btn" 
              onClick={reportMessage}
              title="Report response"
            >
              <Flag size={14} color={reported ? '#ff6b6b' : undefined} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default function Chat() {
  const location = useLocation();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [attachedFile, setAttachedFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [hasLoadedFromStorage, setHasLoadedFromStorage] = useState(false);
  
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);

  // FIXED: Correct API configuration for Gemini
  const GOOGLE_AI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';
  const GEMINI_MODEL = 'models/gemma-3-27b-it'; // Fixed model name
  const apiKey = ``;

  // IMPROVED SYSTEM PROMPT with better image URL guidelines
  const SYSTEM_PROMPT = `You are **Orpheus**, a trusted AI assistant for public safety and civic help, built for the residents of **Indianapolis, Indiana**.

Your role is to inform, guide, and support users with:
- Scam and fraud awareness
- Public safety tips and emergency procedures
- Local civic services and how to access them
- Health and safety advisories (e.g. air quality, severe weather)
- Community updates and guidance during incidents

Be clear, brief, helpful, and kind. If you’re unsure of the answer, provide general safety best practices or direct the user to official city or state resources.

❗ Never make up critical information such as phone numbers, addresses, or law enforcement contacts. Always suggest verifying with official websites or city departments.

The user may share personal information such as health conditions (e.g., asthma, allergies). You may gently tailor your response to offer safety-specific guidance based on these conditions.

Always assume the user is a resident of Indianapolis and interested in keeping themselves or their community safe.

---

Example user queries Orpheus should answer:
- “How do I report identity theft?”
- “AQI is bad today — what should I do as someone with asthma?”
- “What scams are common in Indianapolis?”
- “How do I spot a phishing email?”
- “Where do I report a suspicious package?”
- “What’s the best way to stay informed during a storm?”
- “Who do I call to report fraud in Indiana?”
- If user tries to talk about anything other than related to Indianapolis, decline respectfully.

Keep answers conversational, safe, and resourceful.

---
THE INFORMATION ABOUT THE USER IS:
NAME : ${JSON.parse(sessionStorage.getItem('userData')).name}
LOCATION ZIPCODE IN INDIANAPOLIS : ${JSON.parse(sessionStorage.getItem('userData')).zipCode}
PHONE NUMBER : ${JSON.parse(sessionStorage.getItem('userData')).phone}
BLOOD GROUP : ${JSON.parse(sessionStorage.getItem('userData')).bloodGroup}
GENDER : ${JSON.parse(sessionStorage.getItem('userData')).gender}
PERSONALIZE INFORMATION AS PER THESE USER DETAILS
`;

  // Enhanced storage functions with compression
  const saveMessagesToStorage = (msgs) => {
    try {
      const dataToSave = {
        messages: msgs,
        timestamp: Date.now(),
        hasTyped: msgs.map(msg => ({ id: msg.id || Date.now(), hasFinishedTyping: true }))
      };
      sessionStorage.setItem('chatMessages', JSON.stringify(dataToSave));
      sessionStorage.setItem('chatLoadedFromStorage', 'true');
    } catch (error) {
      console.error('Failed to save messages to storage:', error);
    }
  };

  const loadMessagesFromStorage = () => {
    try {
      const savedData = sessionStorage.getItem('chatMessages');
      const hasLoaded = sessionStorage.getItem('chatLoadedFromStorage') === 'true';
      
      if (savedData) {
        const parsedData = JSON.parse(savedData);
        return {
          messages: parsedData.messages || [],
          hasLoadedBefore: hasLoaded,
          typingStates: parsedData.hasTyped || []
        };
      }
      return { messages: [], hasLoadedBefore: false, typingStates: [] };
    } catch (error) {
      console.error('Failed to load messages from storage:', error);
      return { messages: [], hasLoadedBefore: false, typingStates: [] };
    }
  };

  // Initialize messages from storage or location state
  useEffect(() => {
    const { messages: savedMessages, hasLoadedBefore } = loadMessagesFromStorage();
    
    if (location.state?.messages && !hasLoadedBefore) {
      // First time loading with new messages
      setMessages(location.state.messages);
      saveMessagesToStorage(location.state.messages);
      setHasLoadedFromStorage(true);
    } else if (savedMessages.length > 0) {
      // Loading from storage - don't retrigger typing
      setMessages(savedMessages);
      setHasLoadedFromStorage(true);
    }
  }, [location.state]);

  // Save messages whenever they change (but only after initial load)
  useEffect(() => {
    if (messages.length > 0 && hasLoadedFromStorage) {
      saveMessagesToStorage(messages);
    }
  }, [messages, hasLoadedFromStorage]);

  // Enhanced auto-scroll function with input container awareness
  const scrollToBottom = (behavior = 'smooth') => {
    if (messagesEndRef.current && chatContainerRef.current) {
      const chatContainer = chatContainerRef.current;
      
      // Add extra padding to ensure content stays above input
      const scrollTarget = messagesEndRef.current;
      const extraPadding = 180; // Extra space to keep content above input
      
      chatContainer.scrollTo({
        top: scrollTarget.offsetTop + extraPadding,
        behavior: behavior
      });
    }
  };

  // Auto-scroll when messages change
  useEffect(() => {
    const timer = setTimeout(() => scrollToBottom(), 100);
    return () => clearTimeout(timer);
  }, [messages]);

  // Continuous smooth scrolling during typing
  useEffect(() => {
    if (isTyping) {
      const interval = setInterval(() => scrollToBottom(), 100);
      return () => clearInterval(interval);
    }
  }, [isTyping]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      const maxHeight = 100;
      textareaRef.current.style.height = Math.min(scrollHeight, maxHeight) + 'px';
    }
  }, [inputValue]);

  // Helper functions
  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = error => reject(error);
    });
  };

  const getMimeType = (file) => {
    return file.type || 'application/octet-stream';
  };

  const isSupportedFileType = (fileType) => {
    const supportedTypes = [
      'image/png', 'image/jpeg', 'image/webp', 'image/heic', 'image/heif',
      'audio/wav', 'audio/mp3', 'audio/aiff', 'audio/aac', 'audio/ogg', 'audio/flac',
      'video/mp4', 'video/mpeg', 'video/mov', 'video/avi', 'video/x-flv', 'video/mpg', 'video/webm',
      'video/wmv', 'video/3gp',
      'text/plain', 'text/html', 'text/css', 'text/javascript', 'application/json',
      'application/pdf', 'application/rtf',
      'text/x-typescript', 'text/x-python', 'text/x-java', 'text/x-c', 'text/x-cpp',
      'text/x-csharp', 'text/x-php', 'text/x-ruby', 'text/x-go', 'text/x-rust',
      'text/x-swift', 'text/x-kotlin', 'text/x-scala', 'text/x-r', 'text/x-sql',
      'text/xml', 'application/xml', 'text/csv', 'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];
    return supportedTypes.includes(fileType);
  };

  const getFileIcon = (fileType) => {
    if (fileType.startsWith('image/')) return <Image size={16} />;
    if (fileType.startsWith('video/')) return <Video size={16} />;
    if (fileType.startsWith('audio/')) return <Music size={16} />;
    return <FileText size={16} />;
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // File handling
  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setAttachedFile(file);
    
    // Create preview
    const preview = {
      name: file.name,
      size: formatFileSize(file.size),
      type: file.type,
      isSupported: isSupportedFileType(file.type)
    };

    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        preview.url = e.target.result;
        setFilePreview(preview);
      };
      reader.readAsDataURL(file);
    } else {
      setFilePreview(preview);
    }
  };

  const removeFile = () => {
    setAttachedFile(null);
    setFilePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // FIXED: Correct send message function
  const sendMessage = async () => {
    if (!inputValue.trim() && !attachedFile) return;
    if (isLoading) return;

    const messageText = inputValue.trim();
    const userMessage = {
      role: 'user',
      parts: [{ text: messageText }],
      timestamp: new Date().toISOString(),
      hasFile: !!attachedFile,
      fileName: attachedFile?.name
    };

    // Add user message immediately
    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    
    // Clear file after sending
    const currentFile = attachedFile;
    removeFile();

    try {
      // FIXED: Proper request structure for Gemini API
      const requestBody = {
        contents: [
          {
            parts: []
          }
        ],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048,
        },
        safetySettings: [
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_HATE_SPEECH", 
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          }
        ]
      };

      // Add system prompt and user message
      const fullMessage = `${SYSTEM_PROMPT}\n\nUser: ${messageText}`;
      requestBody.contents[0].parts.push({ text: fullMessage });

      // Add file if attached
      if (currentFile) {
        try {
          const base64Data = await fileToBase64(currentFile);
          const mimeType = getMimeType(currentFile);
          
          requestBody.contents[0].parts.push({
            inline_data: {
              mime_type: mimeType,
              data: base64Data
            }
          });
        } catch (fileError) {
          console.error('Error processing file:', fileError);
          throw new Error('Failed to process attached file');
        }
      }

      // FIXED: Correct API endpoint
      const response = await axios.post(
        `${GOOGLE_AI_BASE_URL}/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
        requestBody,
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 30000
        }
      );

      // FIXED: Proper response handling
      if (response.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
        const aiResponse = response.data.candidates[0].content.parts[0].text;
        
        const aiMessage = {
          role: 'assistant',
          parts: [{ text: aiResponse }],
          timestamp: new Date().toISOString()
        };

        // Add AI message and start typing effect
        setMessages(prev => [...prev, aiMessage]);
        setIsTyping(true);
        
        // Stop typing effect after message is complete
        setTimeout(() => {
          setIsTyping(false);
        }, aiResponse.length * 15 + 1000);
        
      } else {
        throw new Error('Invalid response format from AI');
      }

    } catch (error) {
      console.error('Error sending message:', error);
      
      let errorMessage = 'Sorry, I encountered an error. Please try again.';
      if (error.code === 'ECONNABORTED') {
        errorMessage = 'Request timed out. Please try again.';
      } else if (error.response?.status === 400) {
        errorMessage = 'Invalid request. Please check your message and try again.';
      } else if (error.response?.status === 403) {
        errorMessage = 'API access denied. Please check your API key.';
      } else if (error.response?.status === 429) {
        errorMessage = 'Rate limit exceeded. Please wait a moment and try again.';
      }

      const errorAiMessage = {
        role: 'assistant',
        parts: [{ text: errorMessage }],
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, errorAiMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle keyboard shortcuts
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Clear chat function
  const clearChat = () => {
    setMessages([]);
    sessionStorage.removeItem('chatMessages');
    sessionStorage.removeItem('chatLoadedFromStorage');
    setHasLoadedFromStorage(false);
  };

  return (
    <div className="chat-container">
      <Sidebar />
      
      <main className="chat-main" ref={chatContainerRef}>
        <div className="chat-messages">
          {messages.length === 0 ? (
            <div className="empty-chat">
              <Bot size={48} />
              <h3>Start a conversation</h3>
              <p>Ask me anything or upload a file to get started</p>
            </div>
          ) : (
            messages.map((message, index) => (
              <Message 
                key={index} 
                message={message} 
                isTyping={isTyping && index === messages.length - 1 && message.role === 'assistant'}
              />
            ))
          )}
          
          {isLoading && (
            <div className="message ai-message loading-message">
              <div className="message-avatar">
                <Bot size={16} />
              </div>
              <div className="message-content">
                <div className="message-header">
                  <span className="message-sender">Orpheus</span>
                </div>
                <div className="message-text">
                  <div className="typing-indicator">
                    <div className="dot"></div>
                    <div className="dot"></div>
                    <div className="dot"></div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        <div className="chat-input-area">
          {filePreview && (
            <div className="file-preview">
              <div className="file-info">
                <div className="file-icon">
                  {filePreview.url ? (
                    <img src={filePreview.url} alt="Preview" className="file-preview-image" />
                  ) : (
                    getFileIcon(filePreview.type)
                  )}
                </div>
                <div className="file-details">
                  <div className="file-name">{filePreview.name}</div>
                  <div className="file-size">
                    {filePreview.size}
                    {!filePreview.isSupported && (
                      <span className="unsupported-format"> (Unsupported format)</span>
                    )}
                  </div>
                </div>
                <button className="remove-file-btn" onClick={removeFile}>
                  <X size={16} />
                </button>
              </div>
            </div>
          )}

          <div className="floating-input-container">
            <div className="input-wrapper">
              <textarea
                ref={textareaRef}
                className="main-input"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message..."
                disabled={isLoading}
                rows={1}
              />
              
              <div className="input-actions">
                <button
                  className="action-btn"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading}
                  title="Attach file"
                >
                  <Paperclip size={18} />
                </button>
                
                <button
                  className={`action-btn submit-btn ${isLoading ? 'spin' : ''}`}
                  onClick={sendMessage}
                  disabled={isLoading || (!inputValue.trim() && !attachedFile)}
                  title="Send message"
                >
                  {isLoading ? <Loader size={18} /> : <Send size={18} />}
                </button>
              </div>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            className="hidden-file-input"
            onChange={handleFileSelect}
            accept="image/*,video/*,audio/*,.txt,.pdf,.doc,.docx,.json,.csv,.html,.css,.js,.ts,.py,.java,.cpp,.c,.cs,.php,.rb,.go,.rs,.swift,.kt,.scala,.r,.sql,.xml"
          />
        </div>
      </main>
    </div>
  );
}