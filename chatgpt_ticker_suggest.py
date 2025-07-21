import google.generativeai as genai
from google.generativeai import types
import os
import ast
import re
import traceback

def get_similar_tickers_from_gemini(liked_tickers, ticker_list):
    # Đặt API Key (nên dùng biến môi trường thực tế)
    api_key = os.getenv("GOOGLE_GEMINI_API_KEY", "AIzaSyC0yEBIWflQgoeTcrv6ASQBuOx58oUNkW4")

    # Cấu hình Gemini
    genai.configure(api_key=api_key)

    # Prompt yêu cầu model trả về đúng định dạng
    prompt = (
        f"The user likes these stock tickers: {', '.join(liked_tickers)}.\n"
        f"The available tickers are: {', '.join(ticker_list)}.\n"
        "Suggest exactly 5 other stock tickers (Vietnam or international) that are similar in sector, industry, or business model.\n"
        "⚠️ Return ONLY a valid Python list of ticker symbols with quotes, commas and square brackets. "
        "No explanation, no markdown. For example:\n['VCB.VN', 'AAPL', 'HPG.VN', 'GOOG', 'VIC.VN']"
    )

    try:
        model = genai.GenerativeModel(
            model_name="gemini-2.5-flash",
            system_instruction="You are a helpful stock recommender. Only return valid Python list of stock tickers, no extra text."
        )

        response = model.generate_content(prompt)

        # Lấy kết quả từ Gemini
        text = getattr(response, 'text', '')
        print("=== Gemini raw response ===")
        print(text)

        # Tìm danh sách hợp lệ trong response
        match = re.search(r"\[.*?\]", text, re.DOTALL)
        if not match:
            print("❌ Không tìm thấy danh sách Python list trong phản hồi.")
            return []

        list_str = match.group(0)
        print(f"✅ Chuỗi danh sách trích xuất: {list_str}")

        # Phân tích thành Python list
        similar_tickers = ast.literal_eval(list_str)
        if isinstance(similar_tickers, list):
            return similar_tickers
        else:
            print("❌ Kết quả không phải list hợp lệ.")
            return []

    except Exception as e:
        print("❌ Lỗi khi gọi Gemini hoặc phân tích kết quả:")
        traceback.print_exc()
        return []
