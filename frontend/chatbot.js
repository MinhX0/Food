// Create and initialize the chatbot UI
function createChatbotUI() {
    const chatbotHTML = `
        <div id="chatbot" class="fixed bottom-4 right-4 z-50">
            <div id="chat-window" class="hidden w-80 h-[450px] bg-green-500 rounded-lg shadow-xl overflow-hidden">
                <!-- Header -->
                <div class="flex justify-between items-center p-4 bg-green-500 text-white">
                    <h3 class="font-bold text-lg">ChatBot</h3>
                    <button id="close-chat" class="text-white hover:text-gray-200">
                        <span class="text-2xl">×</span>
                    </button>
                </div>
                
                <!-- Messages Container -->
                <div id="chat-messages" class="bg-white h-[340px] overflow-y-auto p-4">
                    <div class="chat-message bot-message mb-3">
                        <div class="bg-gray-100 text-gray-800 p-3 rounded-lg inline-block max-w-[85%] rounded-bl-sm">
                            Hey! How can I assist you today?
                        </div>
                    </div>
                </div>
                
                <!-- Input Area -->
                <div class="bg-white p-4 border-t border-gray-200">
                    <div class="relative">
                        <input type="text" id="chat-input" 
                            class="w-full px-4 py-2 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 text-gray-800 placeholder-gray-500"
                            placeholder="Type your message...">
                        <button id="send-message" 
                            class="absolute right-2 top-1/2 transform -translate-y-1/2 text-green-500 hover:text-green-600 p-1 rounded transition-colors">
                            <i class="fas fa-paper-plane"></i>
                        </button>
                    </div>
                </div>
            </div>

            <!-- Chat Toggle Button -->
            <button id="toggle-chat" class="bg-green-500 w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-white hover:bg-green-600 transition-colors duration-200 ml-auto">
                <i class="fas fa-comments text-2xl"></i>
            </button>
        </div>
    `;

    // Add chatbot HTML to the page
    document.body.insertAdjacentHTML('beforeend', chatbotHTML);

    // Get DOM elements
    const chatWindow = document.getElementById('chat-window');
    const toggleChat = document.getElementById('toggle-chat');
    const closeChat = document.getElementById('close-chat');
    const chatInput = document.getElementById('chat-input');
    const sendMessage = document.getElementById('send-message');
    const chatMessages = document.getElementById('chat-messages');

    // Add message to chat
    function addMessage(message, isBot = false) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${isBot ? 'bot-message' : 'user-message'} mb-3`;
        
        const bubble = document.createElement('div');
        if (isBot) {
            bubble.className = 'bg-gray-100 text-gray-800 p-3 rounded-lg inline-block max-w-[85%] rounded-bl-sm';
        } else {
            bubble.className = 'bg-blue-500 text-white p-3 rounded-lg inline-block max-w-[85%] ml-auto rounded-br-sm';
        }
        bubble.textContent = message;
        
        messageDiv.appendChild(bubble);
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // Show error message
    function showError() {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'chat-message bot-message mb-3';
        errorDiv.innerHTML = `
            <div class="bg-red-100 text-red-600 p-3 rounded-lg inline-block max-w-[85%] border border-red-200 rounded-bl-sm">
                Oops! Something went wrong. Please try again
            </div>
        `;
        chatMessages.appendChild(errorDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // Handle sending message
    async function handleSendMessage() {
        const message = chatInput.value.trim();
        if (!message) return;

        // Add user message
        addMessage(message, false);
        chatInput.value = '';

        try {
            // TODO: Replace with actual API call
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ message })
            });

            if (!response.ok) throw new Error('API request failed');

            // Simulate API delay
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Add bot response
            // TODO: Replace with actual API response
            addMessage("I'm processing your request...", true);

        } catch (error) {
            console.error('Chat error:', error);
            showError();
        }
    }

    // Event Listeners
    toggleChat.addEventListener('click', () => {
        chatWindow.classList.toggle('hidden');
        if (!chatWindow.classList.contains('hidden')) {
            chatInput.focus();
        }
    });

    closeChat.addEventListener('click', () => {
        chatWindow.classList.add('hidden');
    });

    sendMessage.addEventListener('click', handleSendMessage);

    chatInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            handleSendMessage();
        }
    });
}

// Add styles
function addChatbotStyles() {
    const styles = document.createElement('style');
    styles.textContent = `
        .chat-message {
            animation: slideIn 0.3s ease-out;
        }

        .bot-message {
            display: flex;
            justify-content: flex-start;
        }

        .user-message {
            display: flex;
            justify-content: flex-end;
        }

        @keyframes slideIn {
            from {
                opacity: 0;
                transform: translateY(10px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }

        #chat-messages::-webkit-scrollbar {
            width: 6px;
        }

        #chat-messages::-webkit-scrollbar-track {
            background: #f1f1f1;
        }

        #chat-messages::-webkit-scrollbar-thumb {
            background: #888;
            border-radius: 3px;
        }

        #chat-messages::-webkit-scrollbar-thumb:hover {
            background: #555;
        }

        #chat-window {
            transition: all 0.3s ease-in-out;
            box-shadow: 0 0 20px rgba(0, 0, 0, 0.1);
        }

        #toggle-chat {
            transition: all 0.3s ease-in-out;
        }

        #toggle-chat:hover {
            transform: scale(1.05);
        }
    `;
    document.head.appendChild(styles);
}

// Export initialization function
window.initializeChatbot = function() {
    addChatbotStyles();
    createChatbotUI();
};
