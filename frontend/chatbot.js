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
                            Xin chào! Tôi là trợ lý thị trường chứng khoán của bạn. Hãy hỏi tôi về giá cổ phiếu, xu hướng thị trường hoặc bất kỳ câu hỏi đầu tư nào! 📈
                        </div>
                    </div>
                    <div class="quick-actions flex flex-wrap gap-2 mb-3" id="quick-actions">
                        <button class="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm hover:bg-green-200 transition-colors" 
                                onclick="handleQuickAction('market-status')">📊 Tình hình thị trường</button>
                        <button class="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm hover:bg-blue-200 transition-colors"
                                onclick="handleQuickAction('top-gainers')">🔥 Mã tăng mạnh</button>
                        <button class="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm hover:bg-purple-200 transition-colors"
                                onclick="handleQuickAction('help')">💡 Hướng dẫn</button>
                    </div>
                </div>
                
                <!-- Input Area -->
                <div class="bg-white p-4 border-t border-gray-200">
                    <div class="relative">
                        <input type="text" id="chat-input" 
                            class="w-full px-4 py-2 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 text-gray-800 placeholder-gray-500"
                            placeholder="Nhập câu hỏi của bạn...">
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
        bubble.innerHTML = message; // Changed to innerHTML to support rich content
        
        messageDiv.appendChild(bubble);
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // Add rich message with HTML content
    function addRichMessage(content) {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'chat-message bot-message mb-3';
        messageDiv.innerHTML = `
            <div class="bg-gray-100 text-gray-800 p-3 rounded-lg inline-block max-w-[95%] rounded-bl-sm">
                ${content}
            </div>
        `;
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // Stock market query classification
    function classifyStockQuery(message) {
        const msg = message.toLowerCase();
        
        // Stock price patterns (Vietnamese)
        if (msg.includes('giá') || msg.includes('bao nhiêu') || msg.includes('hiện tại') || msg.includes('đang') || msg.includes('quote')) {
            const symbolMatch = msg.match(/\b([a-z]{2,5})\b/i);
            return { type: 'STOCK_PRICE', symbol: symbolMatch?.[1] };
        }
        
        // Market analysis patterns (Vietnamese)
        if (msg.includes('thị trường') || msg.includes('xu hướng') || msg.includes('phân tích') || msg.includes('tổng quan') || msg.includes('tình hình')) {
            return { type: 'MARKET_ANALYSIS' };
        }
        
        // Educational patterns (Vietnamese)
        if (msg.includes('là gì') || msg.includes('giải thích') || msg.includes('học') || msg.includes('tìm hiểu') || msg.includes('nghĩa')) {
            return { type: 'EDUCATION' };
        }
        
        // Prediction patterns (Vietnamese)
        if (msg.includes('dự đoán') || msg.includes('dự báo') || msg.includes('tương lai') || msg.includes('sẽ') || msg.includes('predict')) {
            const symbolMatch = msg.match(/\b([a-z]{2,5})\b/i);
            return { type: 'PREDICTION', symbol: symbolMatch?.[1] };
        }
        
        // Help patterns (Vietnamese)
        if (msg.includes('giúp') || msg.includes('hướng dẫn') || msg.includes('làm gì') || msg.includes('commands')) {
            return { type: 'HELP' };
        }
        
        return { type: 'GENERAL', message: msg };
    }

    // Handle stock price queries
    async function handleStockPriceQuery(symbol) {
        if (!symbol) {
            addMessage("Vui lòng chỉ định mã cổ phiếu. Ví dụ: 'Giá VIC bao nhiêu?'", true);
            return;
        }
        
        addMessage("🔍 Đang tra cứu giá hiện tại...", true);
        
        try {
            const response = await fetch(`/ticker_data?symbol=${symbol.toUpperCase()}&days=0`);
            const data = await response.json();
            
            if (data && data.symbol) {
                const changeIcon = data.change_percent >= 0 ? "📈" : "📉";
                const changeColor = data.change_percent >= 0 ? "text-green-600" : "text-red-600";
                
                const priceInfo = `
                    <div class="font-semibold text-lg mb-2">${data.symbol} - ${data.company_name || 'Thông tin cổ phiếu'}</div>
                    <div class="space-y-1">
                        <div>💰 <strong>Giá:</strong> ${data.price ? data.price.toLocaleString() + ' VND' : 'Không có'}</div>
                        <div class="${changeColor}">
                            ${changeIcon} <strong>Thay đổi:</strong> ${data.change_percent ? data.change_percent.toFixed(2) + '%' : 'Không có'}
                        </div>
                        <div>📊 <strong>Khối lượng:</strong> ${data.volume ? data.volume.toLocaleString() : 'Không có'}</div>
                    </div>
                `;
                
                addRichMessage(priceInfo);
            } else {
                addMessage(`Xin lỗi, tôi không thể tìm thấy dữ liệu hiện tại cho ${symbol.toUpperCase()}. Vui lòng kiểm tra mã cổ phiếu và thử lại.`, true);
            }
        } catch (error) {
            addMessage(`Không thể lấy dữ liệu cho ${symbol.toUpperCase()}. Vui lòng thử lại sau.`, true);
        }
    }

    // Handle market analysis
    async function handleMarketAnalysis() {
        addMessage("📊 Đang phân tích xu hướng thị trường hiện tại...", true);
        
        try {
            const response = await fetch('/ticker_status');
            const data = await response.json();
            
            if (data && data.length > 0) {
                const gainers = data.filter(stock => stock.change_percent > 0).length;
                const losers = data.filter(stock => stock.change_percent < 0).length;
                const unchanged = data.filter(stock => stock.change_percent === 0).length;
                
                const marketSummary = `
                    <div class="font-semibold text-lg mb-2">📈 Tổng quan thị trường</div>
                    <div class="space-y-1">
                        <div class="text-green-600">▲ Mã tăng: ${gainers} cổ phiếu</div>
                        <div class="text-red-600">▼ Mã giảm: ${losers} cổ phiếu</div>
                        <div class="text-gray-600">━ Không đổi: ${unchanged} cổ phiếu</div>
                    </div>
                    <div class="mt-2 text-sm text-gray-600">
                        Tâm lý thị trường: ${gainers > losers ? 'Tích cực 🐂' : gainers < losers ? 'Tiêu cực 🐻' : 'Trung tính ⚖️'}
                    </div>
                `;
                
                addRichMessage(marketSummary);
            } else {
                addMessage("Dữ liệu thị trường hiện tại không khả dụng. Vui lòng thử lại sau.", true);
            }
        } catch (error) {
            addMessage("Không thể lấy dữ liệu thị trường vào lúc này.", true);
        }
    }

    // Handle prediction queries
    async function handlePredictionQuery(symbol) {
        if (!symbol) {
            addMessage("Vui lòng chỉ định mã cổ phiếu để dự đoán. Ví dụ: 'Dự đoán VIC'", true);
            return;
        }
        
        addMessage("🔮 Đang phân tích dữ liệu dự đoán...", true);
        
        try {
            const response = await fetch(`/prediction_data?symbol=${symbol.toUpperCase()}`);
            const data = await response.json();
            
            if (data && data.predicted_price) {
                const prediction = `
                    <div class="font-semibold text-lg mb-2">🔮 Dự đoán AI cho ${symbol.toUpperCase()}</div>
                    <div class="space-y-1">
                        <div>💰 <strong>Giá dự đoán:</strong> ${data.predicted_price.toLocaleString()} VND</div>
                        <div>📈 <strong>Xu hướng:</strong> ${data.direction}</div>
                        <div>📊 <strong>Độ tin cậy:</strong> ${(data.probabilities[2] * 100).toFixed(1)}% (Tăng giá)</div>
                    </div>
                    <div class="mt-2 p-2 bg-yellow-50 rounded text-sm">
                        💡 <strong>Khuyến nghị:</strong> ${data.advice}
                    </div>
                `;
                
                addRichMessage(prediction);
            } else {
                addMessage(`Xin lỗi, dữ liệu dự đoán cho ${symbol.toUpperCase()} không khả dụng.`, true);
            }
        } catch (error) {
            addMessage("Không thể lấy dữ liệu dự đoán vào lúc này.", true);
        }
    }

    // Handle educational queries
    function handleEducationalQuery(message) {
        const educationalResponses = {
            'p/e': 'Chỉ số P/E (Price-to-Earnings) đo lường giá cổ phiếu hiện tại so với thu nhập trên mỗi cổ phiếu. P/E cao cho thấy nhà đầu tư kỳ vọng tăng trưởng cao, P/E thấp có thể báo hiệu định giá thấp.',
            'pe': 'Chỉ số P/E (Price-to-Earnings) đo lường giá cổ phiếu hiện tại so với thu nhập trên mỗi cổ phiếu. P/E cao cho thấy nhà đầu tư kỳ vọng tăng trưởng cao, P/E thấp có thể báo hiệu định giá thấp.',
            'vốn hóa': 'Vốn hóa thị trường là tổng giá trị của tất cả cổ phiếu của công ty. Được tính bằng giá cổ phiếu nhân với tổng số cổ phiếu đang lưu hành.',
            'market cap': 'Vốn hóa thị trường là tổng giá trị của tất cả cổ phiếu của công ty. Được tính bằng giá cổ phiếu nhân với tổng số cổ phiếu đang lưu hành.',
            'khối lượng': 'Khối lượng giao dịch là số cổ phiếu được giao dịch trong một khoảng thời gian nhất định. Khối lượng cao thường cho thấy sự quan tâm mạnh mẽ và có thể xác nhận xu hướng giá.',
            'volume': 'Khối lượng giao dịch là số cổ phiếu được giao dịch trong một khoảng thời gian nhất định. Khối lượng cao thường cho thấy sự quan tâm mạnh mẽ và có thể xác nhận xu hướng giá.',
            'cổ tức': 'Cổ tức là khoản thanh toán mà công ty trả cho các cổ đông, thường từ lợi nhuận. Cổ tức cung cấp thu nhập thường xuyên cho nhà đầu tư.',
            'dividend': 'Cổ tức là khoản thanh toán mà công ty trả cho các cổ đông, thường từ lợi nhuận. Cổ tức cung cấp thu nhập thường xuyên cho nhà đầu tư.',
            'hỗ trợ kháng cự': 'Hỗ trợ là mức giá mà cổ phiếu thường ngừng giảm. Kháng cự là mức giá mà cổ phiếu thường ngừng tăng. Những mức này giúp dự đoán chuyển động giá trong tương lai.'
        };
        
        const query = message.toLowerCase();
        let response = null;
        
        for (const [key, value] of Object.entries(educationalResponses)) {
            if (query.includes(key)) {
                response = value;
                break;
            }
        }
        
        if (response) {
            addMessage(`📚 ${response}`, true);
        } else {
            addMessage("Tôi sẵn sàng giải thích các khái niệm thị trường chứng khoán! Hãy hỏi về: P/E, vốn hóa thị trường, khối lượng, cổ tức, hoặc hỗ trợ/kháng cự.", true);
        }
    }

    // Handle help queries
    function handleHelpQuery() {
        const helpMessage = `
            <div class="font-semibold text-lg mb-2">💡 Tôi có thể giúp bạn:</div>
            <div class="space-y-2 text-sm">
                <div><strong>📈 Giá cổ phiếu:</strong> "Giá VIC bao nhiêu?"</div>
                <div><strong>🔮 Dự đoán:</strong> "Dự đoán VHM"</div>
                <div><strong>📊 Phân tích thị trường:</strong> "Tình hình thị trường"</div>
                <div><strong>📚 Giáo dục:</strong> "P/E là gì?"</div>
                <div><strong>💰 Ví dụ:</strong> Thử VIC, VHM, MSN, FPT, v.v.</div>
            </div>
        `;
        addRichMessage(helpMessage);
    }

    // Handle general queries with Gemini AI backend
    async function handleGeneralQuery(message) {
        // Show typing indicator
        const typingDiv = document.createElement('div');
        typingDiv.className = 'chat-message bot-message mb-3';
        typingDiv.id = 'typing-indicator';
        typingDiv.innerHTML = `
            <div class="bg-gray-100 text-gray-600 p-3 rounded-lg inline-block max-w-[85%] rounded-bl-sm">
                <i class="fas fa-circle-notch fa-spin mr-2"></i>Đang suy nghĩ...
            </div>
        `;
        chatMessages.appendChild(typingDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;

        try {
            const response = await fetch('http://localhost:8000/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: message,
                    user_context: {
                        preferred_stocks: [], // Could be populated from user preferences
                        market_sentiment: "neutral"
                    }
                })
            });

            // Remove typing indicator
            const typingIndicator = document.getElementById('typing-indicator');
            if (typingIndicator) {
                typingIndicator.remove();
            }

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    addMessage(data.response, true);
                } else {
                    addMessage(data.response || "Xin lỗi, tôi không thể trả lời câu hỏi này.", true);
                }
            } else {
                throw new Error('Network response was not ok');
            }
        } catch (error) {
            // Remove typing indicator if still present
            const typingIndicator = document.getElementById('typing-indicator');
            if (typingIndicator) {
                typingIndicator.remove();
            }
            
            console.error('Error calling chat API:', error);
            
            // Fallback to local responses
            const fallbackResponses = [
                "Tôi ở đây để giúp bạn về thị trường chứng khoán! Hãy hỏi về cổ phiếu cụ thể hoặc các khái niệm thị trường.",
                "Tôi có thể cung cấp giá cổ phiếu, dự đoán và phân tích thị trường. Bạn muốn biết gì?",
                "Cứ tự nhiên hỏi tôi về bất kỳ cổ phiếu Việt Nam nào hoặc thông tin thị trường chung!",
                "Tôi là trợ lý thị trường chứng khoán của bạn. Hãy hỏi tôi về giá cả, xu hướng hoặc khái niệm đầu tư!"
            ];
            
            const randomResponse = fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
            addMessage(randomResponse + " (Tôi đang gặp sự cố kết nối đến AI, hãy thử lại sau!)", true);
        }
    }

    // Show error message
    function showError() {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'chat-message bot-message mb-3';
        errorDiv.innerHTML = `
            <div class="bg-red-100 text-red-600 p-3 rounded-lg inline-block max-w-[85%] border border-red-200 rounded-bl-sm">
                Oops! Có lỗi xảy ra. Vui lòng thử lại
            </div>
        `;
        chatMessages.appendChild(errorDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // Handle sending message with stock market intelligence
    async function handleSendMessage() {
        const message = chatInput.value.trim();
        if (!message) return;

        // Add user message
        addMessage(message, false);
        chatInput.value = '';

        try {
            // Classify the user's intent
            const intent = classifyStockQuery(message);
            
            switch(intent.type) {
                case 'STOCK_PRICE':
                    await handleStockPriceQuery(intent.symbol);
                    break;
                case 'MARKET_ANALYSIS':
                    await handleMarketAnalysis();
                    break;
                case 'PREDICTION':
                    await handlePredictionQuery(intent.symbol);
                    break;
                case 'EDUCATION':
                    handleEducationalQuery(message);
                    break;
                case 'HELP':
                    handleHelpQuery();
                    break;
                default:
                    handleGeneralQuery(message);
            }
        } catch (error) {
            console.error('Chat error:', error);
            showError();
        }
    }

    // Global function for quick actions
    window.handleQuickAction = function(action) {
        switch(action) {
            case 'market-status':
                addMessage('Cho tôi xem tình hình thị trường', false);
                handleMarketAnalysis();
                break;
            case 'top-gainers':
                addMessage('Những mã nào tăng mạnh nhất?', false);
                // You can implement this separately or as part of market analysis
                addMessage('📈 Tính năng top mã tăng mạnh sẽ có sớm! Hiện tại, hãy thử hỏi về các cổ phiếu cụ thể như VIC, VHM, hoặc MSN.', true);
                break;
            case 'help':
                addMessage('Hướng dẫn tôi cách sử dụng', false);
                handleHelpQuery();
                break;
        }
    };

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
