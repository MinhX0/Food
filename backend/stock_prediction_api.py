from fastapi import FastAPI, Query, Body
from pydantic import BaseModel
from typing import Optional
import uvicorn
import traceback
import pandas as pd

# Import the StockPredictor class from the current file
from stock_prediction_rf import StockPredictor
from chatgpt_ticker_suggest import get_similar_tickers_from_gemini
from chatgpt_chatbot import get_stock_chatbot_response



import time
# Global cache for ticker data
ticker_data_cache = {}
# Global cache for prediction results: (symbol, lookback_days) -> (result, timestamp)
prediction_cache = {}

# Cache management function
def get_cached_prediction(symbol: str, lookback_days: int) -> tuple[dict | None, float | None]:
    cache_key = (symbol, lookback_days)
    print(f"Looking for cache key: {cache_key}")
    print(f"Available cache keys: {list(prediction_cache.keys())}")
    
    if cache_key in prediction_cache:
        result, cached_time = prediction_cache[cache_key]
        now = time.time()
        age = now - cached_time
        print(f"Cache hit for {symbol} (age: {age:.1f}s) - cache persists until restart")
        return result, cached_time
    else:
        print(f"No cache entry found for {cache_key}")
    
    return None, None

def cache_prediction(symbol: str, lookback_days: int, result: dict):
    cache_key = (symbol, lookback_days)
    now = time.time()
    prediction_cache[cache_key] = (result, now)
    print(f"Cached prediction for {symbol}")

DEFAULT_TICKERS = ["VCB.VN", "VIC.VN", "VHM.VN", "HPG.VN", "FPT.VN", "BID.VN", "GAS.VN", "VNM.VN", "TCB.VN", "CTG.VN", "VPB.VN", "MBB.VN", "ACB.VN", "MSN.VN", "MWG.VN", "GVR.VN", "STB.VN", "HDB.VN", "SSI.VN", "VRE.VN", "SAB.VN", "PLX.VN", "VJC.VN", "TPB.VN", "POW.VN", "DGC.VN", "PNJ.VN", "BVH.VN", "REE.VN", "KDH.VN", "EIB.VN", "OCB.VN", "MSB.VN", "LPB.VN", "SHB.VN", "VIB.VN", "PDR.VN", "DXG.VN", "HSG.VN", "PC1.VN", ]
# DEFAULT_TICKERS = ["VCB.VN", "VIC.VN", "VHM.VN" ]
# CSV file paths
USER_PREF_CSV = "user_preferences.csv"

# User preferences cache (in-memory, loaded from CSV)
user_preferences = set()

app = FastAPI()
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # hoặc ["http://localhost:5500"]
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Helper function to get currency for a symbol
def get_currency_for_symbol(symbol):
    """Determine the currency based on the stock symbol"""
    if symbol.upper().endswith('.VN'):
        return 'VND'
    elif symbol.upper().endswith('.HK'):
        return 'HKD'
    elif symbol.upper().endswith('.L') or symbol.upper().endswith('.LON'):
        return 'GBP'
    elif symbol.upper().endswith('.TO') or symbol.upper().endswith('.TSE'):
        return 'CAD'
    elif symbol.upper().endswith('.SI'):
        return 'SGD'
    elif symbol.upper().endswith('.AX'):
        return 'AUD'
    elif symbol.upper().endswith('.T') or symbol.upper().endswith('.JP'):
        return 'JPY'
    elif symbol.upper().endswith('.DE') or symbol.upper().endswith('.F'):
        return 'EUR'
    elif symbol.upper().endswith('.PA'):
        return 'EUR'
    elif symbol.upper().endswith('.SW'):
        return 'CHF'
    else:
        # Default to USD for US stocks and others
        return 'USD'

# Helper function to format price with currency
def format_price_with_currency(price, currency):
    """Format price based on currency"""
    if price is None:
        return None
    
    if currency == 'VND':
        # Vietnamese Dong - no decimal places
        return f"{price:,.0f} ₫"
    elif currency == 'JPY':
        # Japanese Yen - no decimal places
        return f"¥{price:,.0f}"
    elif currency == 'USD':
        # US Dollar - 2 decimal places
        return f"${price:,.2f}"
    elif currency == 'EUR':
        # Euro - 2 decimal places
        return f"€{price:,.2f}"
    elif currency == 'GBP':
        # British Pound - 2 decimal places
        return f"£{price:,.2f}"
    elif currency == 'CAD':
        # Canadian Dollar - 2 decimal places
        return f"C${price:,.2f}"
    elif currency == 'AUD':
        # Australian Dollar - 2 decimal places
        return f"A${price:,.2f}"
    elif currency == 'HKD':
        # Hong Kong Dollar - 2 decimal places
        return f"HK${price:,.2f}"
    elif currency == 'SGD':
        # Singapore Dollar - 2 decimal places
        return f"S${price:,.2f}"
    elif currency == 'CHF':
        # Swiss Franc - 2 decimal places
        return f"CHF{price:,.2f}"
    else:
        # Default formatting - 2 decimal places
        return f"{price:,.2f} {currency}"

# Endpoint: Get all tickers with current price and up/down indicator
@app.get("/ticker_status") 
def get_ticker_status():
    result = []
    for symbol in DEFAULT_TICKERS:
        df = ticker_data_cache.get(symbol)
        price = None
        prev_price = None
        # Lấy tên công ty từ cache nếu có
        company_name = symbol
        if df is not None and hasattr(df, 'attrs') and 'company_name' in getattr(df, 'attrs', {}):
            company_name = df.attrs['company_name']
        # Try cache first, then fetch if needed
        if df is None or df.empty or 'Close' not in df.columns:
            predictor = StockPredictor(symbol)
            if not predictor.fetch_data():
                currency = get_currency_for_symbol(symbol)
                result.append({"symbol": symbol, "price": None, "indicator": "unknown", "company_name": company_name, "currency": currency, "formatted_price": None})
                continue
            df = predictor.data
            if df is not None and not df.empty and 'Close' in df.columns:
                ticker_data_cache[symbol] = df.copy()
            else:
                currency = get_currency_for_symbol(symbol)
                result.append({"symbol": symbol, "price": None, "indicator": "unknown", "company_name": company_name, "currency": currency, "formatted_price": None})
                continue
        # Now df should be valid
        try:
            last_row = df.iloc[-1]
            price = last_row['Close'] if 'Close' in last_row else None
            if len(df) > 1:
                prev_row = df.iloc[-2]
                prev_price = prev_row['Close'] if 'Close' in prev_row else None
        except Exception:
            price = None
            prev_price = None
        def safe_float(val):
            try:
                f = float(val)
                if pd.isna(f) or pd.isnull(f) or f != f or f == float('inf') or f == float('-inf'):
                    return None
                return f
            except Exception:
                return None
        price = safe_float(price)
        prev_price = safe_float(prev_price)
        change_percent = None
        if price is not None and prev_price not in (None, 0):
            change_percent = ((price - prev_price) / prev_price) * 100
        if price is not None and prev_price is not None:
            if price > prev_price:
                indicator = "up"
            elif price < prev_price:
                indicator = "down"
            else:
                indicator = "no_change"
        else:
            indicator = "unknown"
        
        # Get currency and format price
        currency = get_currency_for_symbol(symbol)
        formatted_price = format_price_with_currency(price, currency)
        
        result.append({
            "symbol": symbol,
            "price": price,
            "indicator": indicator,
            "company_name": company_name,
            "change_percent": change_percent,
            "currency": currency,
            "formatted_price": formatted_price
        })    
    return {"tickers": result}


class PredictionRequest(BaseModel):
    symbol: str
    lookback_days: Optional[int] = 10


# Endpoint 2: Get prediction data for a ticker (GET version)
@app.get("/prediction_data")
def get_prediction_data(symbol: str = Query(..., description="Ticker symbol, e.g. AAPL"), lookback_days: int = Query(130, description="Lookback days for features")):
    try:
        print(f"Prediction request for {symbol} with {lookback_days} lookback days")
        
        # Check cache first
        cached_result, cached_time = get_cached_prediction(symbol, lookback_days)
        if cached_result:
            print(f"Cache hit! Returning cached prediction for {symbol}")
            return cached_result
        
        print(f"Cache miss for {symbol}, computing new prediction...")
        
        # Not cached or expired, compute prediction
        predictor = StockPredictor(symbol, lookback_days=lookback_days)
        if not predictor.fetch_data():
            return {"error": "Could not fetch data for symbol."}
        if not predictor.train_model():
            return {"error": "Not enough data to train model."}
        prediction = predictor.predict_next_day()
        if prediction is None:
            return {"error": "Prediction failed."}
        if hasattr(predictor, 'data') and hasattr(predictor.data, 'attrs') and 'company_name' in predictor.data.attrs:
            company_name = predictor.data.attrs['company_name']
        else:
            company_name = symbol
        advice = predictor.get_investment_advice(prediction)
        direction_text = predictor.get_direction_text(prediction['direction'])
        
        # Get currency and format prices
        currency = get_currency_for_symbol(symbol)
        formatted_current_price = format_price_with_currency(prediction['current_price'], currency)
        formatted_predicted_price = format_price_with_currency(prediction['predicted_price'], currency)
        
        result = {
            "symbol": symbol,
            "company_name": company_name,
            "current_price": prediction['current_price'],
            "predicted_price": prediction['predicted_price'],
            "predicted_return": prediction['predicted_return'],
            "direction": direction_text,
            "confidence": prediction['confidence'],
            "probabilities": list(prediction['probabilities']),
            "advice": advice,
            "currency": currency,
            "formatted_current_price": formatted_current_price,
            "formatted_predicted_price": formatted_predicted_price
        }
        # Cache the prediction result
        cache_prediction(symbol, lookback_days, result)
        return result
    except Exception as e:
        return {"error": str(e), "trace": traceback.format_exc()}



# Helper: Save all prefetched ticker data to CSV (one file, with symbol column)# Helper: Load prefetched ticker data from CSV
# Helper: Save user preferences to CSV
def save_user_preferences_to_csv():
    if user_preferences:
        pref_df = pd.DataFrame({"symbol": list(user_preferences)})
        pref_df.to_csv(USER_PREF_CSV, index=False)

# Helper: Load user preferences from CSV
def load_user_preferences_from_csv():
    try:
        df = pd.read_csv(USER_PREF_CSV)
        user_preferences.clear()
        for _, row in df.iterrows():
            user_preferences.add(row['symbol'])
        print(f"Loaded user preferences from {USER_PREF_CSV}")
    except Exception as e:
        print(f"No user preferences found: {e}")





# Prefetch ticker data and prediction cache at startup
@app.on_event("startup")
def prefetch_ticker_data():
    print("Prefetching ticker data for:", DEFAULT_TICKERS)
    for symbol in DEFAULT_TICKERS:
        try:
            predictor = StockPredictor(symbol)
            if predictor.fetch_data():
                ticker_data_cache[symbol] = predictor.data.copy()
                print(f"Prefetched {symbol} ({len(predictor.data)} rows)")
                # Prefill prediction cache for default lookback_days (130)
                if predictor.train_model():
                    prediction = predictor.predict_next_day()
                    if prediction is not None:
                        if hasattr(predictor, 'data') and hasattr(predictor.data, 'attrs') and 'company_name' in predictor.data.attrs:
                            company_name = predictor.data.attrs['company_name']
                        else:
                            company_name = symbol
                        advice = predictor.get_investment_advice(prediction)
                        direction_text = predictor.get_direction_text(prediction['direction'])
                        
                        # Get currency and format prices
                        currency = get_currency_for_symbol(symbol)
                        formatted_current_price = format_price_with_currency(prediction['current_price'], currency)
                        formatted_predicted_price = format_price_with_currency(prediction['predicted_price'], currency)
                        
                        result = {
                            "symbol": symbol,
                            "company_name": company_name,
                            "current_price": prediction['current_price'],
                            "predicted_price": prediction['predicted_price'],
                            "predicted_return": prediction['predicted_return'],
                            "direction": direction_text,
                            "confidence": prediction['confidence'],
                            "probabilities": list(prediction['probabilities']),
                            "advice": advice,
                            "currency": currency,
                            "formatted_current_price": formatted_current_price,
                            "formatted_predicted_price": formatted_predicted_price
                        }
                        # Cache the prediction with default lookback days
                        cache_prediction(symbol, 130, result)
                        print(f"Prefilled prediction cache for {symbol}")
            else:
                print(f"Failed to prefetch {symbol}")
        except Exception as e:
            print(f"Error prefetching {symbol}: {e}")
    load_user_preferences_from_csv()

# Endpoint 1: Get ticker data for charting
@app.get("/ticker_data")
def get_ticker_data(symbol: str = Query(..., description="Ticker symbol, e.g. AAPL"), days: int = Query(30, description="Number of days to fetch")):
    try:
        import yfinance as yf
        df = ticker_data_cache.get(symbol)
        if df is None or df.empty or 'Close' not in df.columns:
            predictor = StockPredictor(symbol)
            if not predictor.fetch_data():
                return {"error": "Could not fetch data for symbol."}
            df = predictor.data
            if df is not None and not df.empty and 'Close' in df.columns:
                ticker_data_cache[symbol] = df.copy()
            else:
                return {"error": "No valid data for symbol."}
        df = df.tail(days)
        # Get company name using yfinance (do not cache)
        try:
            ticker_obj = yf.Ticker(symbol)
            info = ticker_obj.info
            company_name = info.get('shortName') or info.get('longName') or info.get('name') or symbol
        except Exception:
            company_name = symbol
        # Fix: ensure index is serializable (convert DatetimeIndex to string)
        df = df.copy()
        if not df.empty:
            # Always convert the index to a string column, but do not rename if already present
            df = df.reset_index()
            # Ensure all column names are strings (avoid tuple column names from MultiIndex)
            df.columns = [str(col) if not isinstance(col, str) else col for col in df.columns]
            # Convert the first column (index) to string type for JSON serialization
            first_col = df.columns[0]
            df[first_col] = df[first_col].astype(str)
            # Convert all columns to native Python types to avoid numpy types in JSON
            data = df.applymap(lambda x: x.item() if hasattr(x, 'item') else x).to_dict(orient="records")
        else:
            data = []
        return {"symbol": symbol, "company_name": company_name, "data": data}
    except Exception as e:
        return {"error": str(e), "trace": traceback.format_exc()}


# Endpoint: Save user preference (POST)
from fastapi import Body

class UserPreferenceRequest(BaseModel):
    symbol: str

@app.post("/save_preference")
def save_user_preference(req: UserPreferenceRequest):
    if req.symbol in user_preferences:
        return {"status": "exists", "message": "Symbol already in preferences."}
    user_preferences.add(req.symbol)
    save_user_preferences_to_csv()
    return {"status": "success"}

@app.post("/remove_preference")
def remove_user_preference(req: UserPreferenceRequest):
    user_preferences.discard(req.symbol)
    save_user_preferences_to_csv()
    return {"status": "success"}

# Endpoint: Get user preferences (GET)  
@app.get("/get_preferences")
def get_user_preferences():
    return {"preferences": list(user_preferences)}

@app.get("/suggest_similar_tickers", tags=["Discovery"], summary="Suggest similar tickers using ChatGPT")
def suggest_similar_tickers():
    """
    Suggests similar tickers to those liked by the user, using ChatGPT API.
    """
    try:
        liked_tickers = list(user_preferences)
        if not liked_tickers:
            return {"error": "No liked tickers found."}
        similar_tickers = get_similar_tickers_from_gemini(liked_tickers, DEFAULT_TICKERS)
        return {"liked_tickers": liked_tickers, "suggested_tickers": similar_tickers}
    except Exception as e:
        return {"error": str(e), "trace": traceback.format_exc()}

class ChatRequest(BaseModel):
    message: str
    user_context: Optional[dict] = None

@app.post("/api/chat", tags=["Chatbot"], summary="Chat with AI about stock market questions")
def chat_with_ai(request: ChatRequest):
    """
    Chat endpoint for stock market questions using Gemini AI.
    Only responds to stock-related questions in Vietnamese.
    """
    try:
        # Get response from Gemini chatbot
        response = get_stock_chatbot_response(request.message, request.user_context)
        
        return {
            "success": response["success"],
            "response": response["response"],
            "error": response.get("error")
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "response": "Xin lỗi, có lỗi xảy ra khi xử lý câu hỏi của bạn. Vui lòng thử lại sau."
        }

@app.get("/debug/cache_status", tags=["Debug"], summary="Show cache status for debugging")
def get_cache_status():
    """
    Debug endpoint to show what's currently in the prediction cache.
    """
    cache_info = []
    now = time.time()
    
    for cache_key, (result, cached_time) in prediction_cache.items():
        symbol, lookback_days = cache_key
        age = now - cached_time
        
        cache_info.append({
            "symbol": symbol,
            "lookback_days": lookback_days,
            "cached_time": cached_time,
            "age_seconds": round(age, 1),
            "is_valid": True,  # Always valid since no TTL
            "note": "Cache persists until server restart"
        })
    
    return {
        "cache_count": len(prediction_cache),
        "cache_policy": "Persistent until restart",
        "current_time": now,
        "cache_entries": cache_info
    }

@app.post("/batch_ticker_info")
def get_batch_ticker_info(symbols: list[str] = Body(..., description="List of ticker symbols")):
    """
    Returns detailed information for a batch of tickers including latest price, company name, 
    last updated date, and other relevant data.
    """
    result = []
    for symbol in symbols:
        try:
            df = ticker_data_cache.get(symbol)
            if df is None or df.empty or 'Close' not in df.columns:
                predictor = StockPredictor(symbol)
                if not predictor.fetch_data():
                    result.append({
                        "symbol": symbol,
                        "error": "Could not fetch data",
                        "status": "error"
                    })
                    continue
                df = predictor.data
                if df is not None and not df.empty and 'Close' in df.columns:
                    ticker_data_cache[symbol] = df.copy()
                else:
                    result.append({
                        "symbol": symbol,
                        "error": "No valid data",
                        "status": "error"
                    })
                    continue

            # Lấy thông tin mới nhất
            last_row = df.iloc[-1]
            last_date = df.index[-1].strftime("%Y-%m-%d") if isinstance(df.index[-1], pd.Timestamp) else str(df.index[-1])
            
            # Lấy giá và tính % thay đổi
            current_price = float(last_row['Close']) if 'Close' in last_row else None
            prev_price = float(df.iloc[-2]['Close']) if len(df) > 1 and 'Close' in df.iloc[-2] else None
            
            # Tính Returns
            returns = float(last_row['Returns']) if 'Returns' in last_row else None
            if returns is None and current_price is not None and prev_price is not None:
                returns = ((current_price - prev_price) / prev_price)
            
            change_percent = None
            if current_price is not None and prev_price is not None and prev_price != 0:
                change_percent = ((current_price - prev_price) / prev_price) * 100

            # Xác định indicator
            indicator = "unknown"
            if current_price is not None and prev_price is not None:
                if current_price > prev_price:
                    indicator = "up"
                elif current_price < prev_price:
                    indicator = "down"
                else:
                    indicator = "no_change"

            # Lấy tên công ty
            company_name = symbol
            if hasattr(df, 'attrs') and 'company_name' in df.attrs:
                company_name = df.attrs['company_name']

            result.append({
                "symbol": symbol,
                "company_name": company_name,
                "price": current_price,
                "change_percent": change_percent,
                "indicator": indicator,
                "last_updated": last_date,
                "returns": returns,
                "status": "success"
            })

        except Exception as e:
            result.append({
                "symbol": symbol,
                "error": str(e),
                "status": "error"
            })

    return {"data": result}

@app.get("/ticker_closing_prices", summary="Get closing prices for a ticker")
def get_ticker_closing_prices(symbol: str = Query(..., description="Ticker symbol, e.g. VCB.VN"), days: int = Query(30, description="Number of days to fetch")):
    """
    Returns a list of closing prices for the given ticker, for the specified number of days (most recent first).
    """
    try:
        df = None
        if symbol in ticker_data_cache:
            df = ticker_data_cache[symbol].tail(days)
        else:
            predictor = StockPredictor(symbol)
            if not predictor.fetch_data():
                return {"error": "Could not fetch data for symbol."}
            df = predictor.data.tail(days)
            ticker_data_cache[symbol] = predictor.data.copy()
        if df is not None and not df.empty and 'Close' in df.columns:
            closing_prices = [float(x) for x in df['Close'].values.flatten()]
        else:
            closing_prices = []
        return {"symbol": symbol, "closing_prices": closing_prices}
    except Exception as e:
        return {"error": str(e), "trace": traceback.format_exc()}

# For local testing
if __name__ == "__main__":
    uvicorn.run("stock_prediction_api:app", host="0.0.0.0", port=8000, reload=True)