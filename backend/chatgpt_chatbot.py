from google import genai
from google.genai import types
import traceback

def get_stock_chatbot_response(user_message: str, user_context: dict = None) -> dict:
    """
    Get response from Gemini API for stock-related questions only.
    
    Args:
        user_message (str): The user's question
        user_context (dict): Optional context about user's portfolio, preferences, etc.
    
    Returns:
        dict: Response containing 'success', 'response', and optional 'error'
    """
    try:
        # Get API key and create client
        api_key = "AIzaSyALbt9ylByGrIC2Ju8i_hQq4_Mb5LLr7YQ"
        client = genai.Client(api_key=api_key)
        
        # Create a stock market focused system prompt in Vietnamese
        system_prompt = """
        Bạn là một chuyên gia tư vấn đầu tư chứng khoán Việt Nam thông minh và hữu ích. 
        
        QUAN TRỌNG: Bạn CHỈ trả lời các câu hỏi liên quan đến:
        - Thị trường chứng khoán
        - Đầu tư cổ phiếu
        - Phân tích tài chính
        - Khái niệm kinh tế
        - Chiến lược đầu tư
        - Quản lý rủi ro
        - Tin tức tài chính
        
        Nếu câu hỏi KHÔNG liên quan đến chứng khoán/đầu tư, hãy từ chối lịch sự và hướng dẫn người dùng hỏi về chủ đề chứng khoán.
        
        Phong cách trả lời:
        - GIỮ CÂU TRẢ LỜI NGẮN GỌN (tối đa 3-4 câu)
        - Đưa ra định nghĩa hoặc giải thích cơ bản
        - Luôn kết thúc bằng gợi ý xem thêm thông tin chi tiết
        - Sử dụng tiếng Việt tự nhiên và chuyên nghiệp
        - Sử dụng emoji phù hợp để tạo sự thân thiện
        - Nhắc nhở về rủi ro đầu tư khi cần thiết
        
        LUÔN KẾT THÚC với một trong những gợi ý sau:
        - "📊 Xem thêm phân tích chi tiết tại trang Ticker để hiểu rõ hơn!"
        - "📈 Khám phá dữ liệu cổ phiếu thực tế tại trang All Stocks!"
        - "🎯 Tìm hiểu thêm về dự đoán giá tại trang Request Stocks!"
        - "💡 Đọc thêm hướng dẫn đầu tư tại trang About!"
        
        Lưu ý: Đây là lời khuyên giáo dục, không phải lời khuyên đầu tư cụ thể.
        """
        
        # Add user context if available
        context_info = ""
        if user_context:
            if user_context.get('preferred_stocks'):
                context_info += f"\nCác cổ phiếu quan tâm: {', '.join(user_context['preferred_stocks'])}"
            if user_context.get('market_sentiment'):
                context_info += f"\nTình hình thị trường hiện tại: {user_context['market_sentiment']}"
        
        # Combine system prompt with user message
        full_prompt = f"{system_prompt}\n\nThông tin bối cảnh:{context_info}\n\nCâu hỏi của người dùng: {user_message}\n\nTrả lời:"
        
        # Generate response using the new client pattern
        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=[{"role": "user", "parts": [{"text": full_prompt}]}],
            config=types.GenerateContentConfig(
                thinking_config=types.ThinkingConfig(thinking_budget=0)
            ),
        )
        
        if response and response.candidates and len(response.candidates) > 0:
            # Get the response text
            ai_response = response.candidates[0].content.parts[0].text.strip()
            
            # Check if the AI refused to answer (indicating non-stock question)
            refusal_keywords = [
                "không liên quan", "không phải", "chỉ trả lời", 
                "không thể trả lời", "ngoài chủ đề", "không thuộc"
            ]
            
            is_refusal = any(keyword in ai_response.lower() for keyword in refusal_keywords)
            
            if is_refusal:
                return {
                    "success": True,
                    "response": "🤔 Tôi chỉ có thể giúp bạn về các vấn đề liên quan đến thị trường chứng khoán và đầu tư. Bạn có thể hỏi tôi về:\n\n📈 Phân tích cổ phiếu\n💰 Chiến lược đầu tư\n📊 Khái niệm tài chính\n🎯 Quản lý rủi ro\n📰 Tin tức thị trường\n\nHãy thử hỏi một câu khác về chứng khoán nhé!"
                }
            
            return {
                "success": True,
                "response": ai_response
            }
        else:
            return {
                "success": False,
                "error": "Empty response from Gemini",
                "response": "Xin lỗi, tôi không thể tạo ra câu trả lời lúc này. Vui lòng thử lại."
            }
            
    except Exception as e:
        print(f"Error in get_stock_chatbot_response: {e}")
        traceback.print_exc()
        return {
            "success": False,
            "error": str(e),
            "response": "Xin lỗi, có lỗi xảy ra khi xử lý câu hỏi của bạn. Vui lòng thử lại sau."
        }

def is_stock_related_query(message: str) -> bool:
    """
    Check if a message is related to stocks/investment.
    This is a fallback check in case Gemini doesn't filter properly.
    """
    stock_keywords = [
        # Vietnamese stock terms
        'cổ phiếu', 'chứng khoán', 'đầu tư', 'thị trường', 'giá', 'mua', 'bán',
        'vốn hóa', 'p/e', 'eps', 'roe', 'roa', 'dividend', 'cổ tức',
        'vnindex', 'hsx', 'hnx', 'upcom', 'etf', 'fund', 'quỹ',
        'phân tích', 'dự đoán', 'xu hướng', 'tăng', 'giảm', 'biến động',
        'rủi ro', 'lợi nhuận', 'portfolio', 'danh mục', 'chiến lược',
        
        # English stock terms (in case users mix languages)
        'stock', 'share', 'invest', 'market', 'trading', 'broker',
        'bull', 'bear', 'volatility', 'return', 'yield', 'growth'
    ]
    
    message_lower = message.lower()
    return any(keyword in message_lower for keyword in stock_keywords)

# Test function
def test_chatbot():
    """Test function to verify the chatbot works"""
    test_questions = [
        "P/E ratio là gì?",
        "Làm thế nào để phân tích cổ phiếu?",
        "Thời tiết hôm nay thế nào?",  # Should be rejected
        "Chiến lược đầu tư dài hạn như thế nào?"
    ]
    
    for question in test_questions:
        print(f"\nQuestion: {question}")
        result = get_stock_chatbot_response(question)
        print(f"Response: {result['response']}")
        print(f"Success: {result['success']}")
        if not result['success']:
            print(f"Error: {result.get('error', 'Unknown error')}")

