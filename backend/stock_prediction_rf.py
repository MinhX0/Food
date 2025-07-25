import yfinance as yf
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor, RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report
from sklearn.preprocessing import StandardScaler
import warnings
warnings.filterwarnings('ignore')

class StockPredictor:
    def __init__(self, symbol, lookback_days=10):
        """
        Khởi tạo bộ dự đoán cổ phiếu
        
        Args:
            symbol: Mã cổ phiếu (VD: 'AAPL', 'GOOGL')
            lookback_days: Số ngày lookback để tạo pattern (mặc định 10 ngày)
        """
        self.symbol = symbol  # Mã cổ phiếu cần dự đoán
        self.lookback_days = lookback_days  # Số ngày dùng để tạo pattern đặc trưng
        self.scaler = StandardScaler()  # Chuẩn hóa dữ liệu đầu vào
        self.model = RandomForestClassifier(n_estimators=100, random_state=42)  # Mô hình phân loại hướng biến động
        self.price_model = RandomForestRegressor(n_estimators=100, random_state=42)  # Mô hình dự đoán giá
        
    def fetch_data(self):
        """Lấy dữ liệu cổ phiếu từ yfinance"""
        try:
            print(f"Đang lấy dữ liệu cho {self.symbol}...")
            # Lấy dữ liệu giá 1 năm gần nhất
            self.data = yf.download(self.symbol, period="1y", interval="1d")
            if self.data.empty:
                raise ValueError(f"Không thể lấy dữ liệu cho mã {self.symbol}")  # Nếu không có dữ liệu thì báo lỗi

            # Lấy tên công ty từ yfinance
            ticker_obj = yf.Ticker(self.symbol)
            info = ticker_obj.info
            company_name = info.get('shortName') or info.get('longName') or info.get('name')
            self.data.attrs['company_name'] = company_name  # Lưu tên công ty vào thuộc tính của DataFrame

            # Tính các chỉ số kỹ thuật
            self.data['Returns'] = self.data['Close'].pct_change()  # Tỉ suất sinh lời hàng ngày
            self.data['Price_Change'] = self.data['Close'].diff()  # Thay đổi giá tuyệt đối
            self.data['Volume_Change'] = self.data['Volume'].pct_change()  # Thay đổi khối lượng giao dịch
            self.data['MA_5'] = self.data['Close'].rolling(window=5).mean()  # Trung bình động 5 ngày
            self.data['MA_10'] = self.data['Close'].rolling(window=10).mean()  # Trung bình động 10 ngày
            self.data['MA_20'] = self.data['Close'].rolling(window=20).mean()  # Trung bình động 20 ngày

            # Tính RSI
            delta = self.data['Close'].diff()
            gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
            loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
            rs = gain / loss
            self.data['RSI'] = 100 - (100 / (1 + rs))

            # Tính độ biến động giá
            self.data['Volatility'] = self.data['Returns'].rolling(window=20).std()

            self.data = self.data.dropna()  # Loại bỏ các dòng có giá trị NaN
            
            print(f"Đã lấy thành công {len(self.data)} ngày dữ liệu cho {self.symbol} (company: {company_name})")
            return True
            
        except Exception as e:
            print(f"Lỗi khi lấy dữ liệu: {e}")
            return False
    
    def create_features(self):
        """Tạo features dựa trên pattern của n ngày trước"""
        features = []
        targets_direction = []
        targets_price = []
        
        # Tạo features từ lookback_days
        for i in range(self.lookback_days, len(self.data) - 1):  # Duyệt qua từng ngày, bắt đầu từ lookback_days
            feature_row = []  # Vector đặc trưng cho 1 sample
            for j in range(self.lookback_days):  # Lấy dữ liệu lookback_days ngày trước
                idx = i - self.lookback_days + j
                # Lấy các đặc trưng: returns, volume_change, MA ratios, RSI, volatility
                returns = float(self.data['Returns'].iloc[idx]) if pd.notna(self.data['Returns'].iloc[idx]) else 0.0
                volume_change = float(self.data['Volume_Change'].iloc[idx]) if pd.notna(self.data['Volume_Change'].iloc[idx]) and not np.isinf(self.data['Volume_Change'].iloc[idx]) else 0.0
                close_price = float(self.data['Close'].iloc[idx])
                ma5_price = float(self.data['MA_5'].iloc[idx]) if pd.notna(self.data['MA_5'].iloc[idx]) else close_price
                ma10_price = float(self.data['MA_10'].iloc[idx]) if pd.notna(self.data['MA_10'].iloc[idx]) else close_price
                rsi = float(self.data['RSI'].iloc[idx]) if pd.notna(self.data['RSI'].iloc[idx]) else 50.0
                volatility = float(self.data['Volatility'].iloc[idx]) if pd.notna(self.data['Volatility'].iloc[idx]) else 0.0
                # Tính tỉ lệ lệch MA
                ma5_ratio = (close_price - ma5_price) / ma5_price if ma5_price != 0 else 0.0
                ma10_ratio = (close_price - ma10_price) / ma10_price if ma10_price != 0 else 0.0
                # Kiểm tra giá trị hợp lệ
                if np.isinf(ma5_ratio) or np.isnan(ma5_ratio):
                    ma5_ratio = 0.0
                if np.isinf(ma10_ratio) or np.isnan(ma10_ratio):
                    ma10_ratio = 0.0
                # Thêm vào vector đặc trưng
                feature_row.extend([returns, volume_change, ma5_ratio, ma10_ratio, rsi, volatility])
            # Đảm bảo đủ số lượng đặc trưng
            if len(feature_row) == self.lookback_days * 6:
                features.append(feature_row)
                # Lấy nhãn mục tiêu: hướng biến động và giá ngày tiếp theo
                next_return = self.data['Returns'].iloc[i + 1]
                next_price = self.data['Close'].iloc[i + 1]
                # Phân loại hướng biến động: tăng, giảm, giữ
                if pd.notna(next_return):
                    if next_return > 0.015:  # Nếu tăng > 1.5%
                        targets_direction.append(2)  # Nhãn: tăng mạnh
                    elif next_return < -0.015:  # Nếu giảm > 1.5%
                        targets_direction.append(0)  # Nhãn: giảm mạnh
                    else:
                        targets_direction.append(1)  # Nhãn: ổn định
                    targets_price.append(next_price)  # Giá mục tiêu
                else:
                    features.pop()  # Nếu target NaN thì loại bỏ sample
        
        return np.array(features), np.array(targets_direction), np.array(targets_price)
    
    def train_model(self):
        """Huấn luyện mô hình"""
        if not hasattr(self, 'data'):
            print("Chưa có dữ liệu. Vui lòng chạy fetch_data() trước.")
            return False
        
        print("Đang tạo features...")
        # Tạo features
        X, y_direction, y_price = self.create_features()
        
        if len(X) < 50:
            print("Không đủ dữ liệu để huấn luyện mô hình")
            return False
        
        print("Đang huấn luyện mô hình...")
        # Chuẩn hóa features
        X_scaled = self.scaler.fit_transform(X)
        
        # Chia dữ liệu
        X_train, X_test, y_dir_train, y_dir_test, y_price_train, y_price_test = train_test_split(
            X_scaled, y_direction, y_price, test_size=0.2, random_state=42
        )
        
        # Huấn luyện mô hình phân loại hướng
        self.model.fit(X_train, y_dir_train)
        
        # Huấn luyện mô hình dự đoán giá
        self.price_model.fit(X_train, y_price_train)
        
        # Đánh giá mô hình
        y_pred = self.model.predict(X_test)
        accuracy = accuracy_score(y_dir_test, y_pred)
        
        print(f"Độ chính xác mô hình: {accuracy:.2%}")
        print("\nBáo cáo chi tiết:")
        print(classification_report(y_dir_test, y_pred, 
                                  target_names=['Giảm mạnh', 'Ổn định', 'Tăng mạnh']))
        
        # Lưu dữ liệu test để vẽ biểu đồ
        self.test_data = {
            'X_test': X_test,
            'y_dir_test': y_dir_test,
            'y_price_test': y_price_test,
            'y_pred': y_pred
        }
        
        return True
    
    def predict_next_day(self):
        """Dự đoán cho ngày tiếp theo"""
        if not hasattr(self, 'model'):
            print("Chưa huấn luyện mô hình. Vui lòng chạy train_model() trước.")
            return None
        
        print("Đang thực hiện dự đoán...")
        # Lấy dữ liệu mới nhất
        latest_data = []
        
        # Tạo features từ lookback_days ngày gần nhất
        for i in range(self.lookback_days):
            idx = len(self.data) - self.lookback_days + i
            
            # Kiểm tra bounds
            if idx < 0 or idx >= len(self.data):
                print(f"Lỗi: Index {idx} nằm ngoài phạm vi dữ liệu")
                return None
            
            # Lấy và xử lý features
            try:
                returns = float(self.data['Returns'].iloc[idx]) if pd.notna(self.data['Returns'].iloc[idx]) else 0.0
                volume_change = float(self.data['Volume_Change'].iloc[idx]) if pd.notna(self.data['Volume_Change'].iloc[idx]) and not np.isinf(self.data['Volume_Change'].iloc[idx]) else 0.0
                close_price = float(self.data['Close'].iloc[idx])
                ma5_price = float(self.data['MA_5'].iloc[idx]) if pd.notna(self.data['MA_5'].iloc[idx]) else close_price
                ma10_price = float(self.data['MA_10'].iloc[idx]) if pd.notna(self.data['MA_10'].iloc[idx]) else close_price
                rsi = float(self.data['RSI'].iloc[idx]) if pd.notna(self.data['RSI'].iloc[idx]) else 50.0
                volatility = float(self.data['Volatility'].iloc[idx]) if pd.notna(self.data['Volatility'].iloc[idx]) else 0.0
                
                # Tính toán MA ratios an toàn
                ma5_ratio = (close_price - ma5_price) / ma5_price if ma5_price != 0 else 0.0
                ma10_ratio = (close_price - ma10_price) / ma10_price if ma10_price != 0 else 0.0
                
                # Kiểm tra inf/nan cho ratios
                if np.isinf(ma5_ratio) or np.isnan(ma5_ratio):
                    ma5_ratio = 0.0
                if np.isinf(ma10_ratio) or np.isnan(ma10_ratio):
                    ma10_ratio = 0.0
                
                latest_data.extend([
                    returns,
                    volume_change,
                    ma5_ratio,
                    ma10_ratio,
                    rsi,
                    volatility
                ])
            except Exception as e:
                print(f"Lỗi khi xử lý dữ liệu tại index {idx}: {e}")
                # Thêm giá trị mặc định nếu có lỗi
                latest_data.extend([0.0, 0.0, 0.0, 0.0, 50.0, 0.0])
        
        # Kiểm tra độ dài features
        if len(latest_data) != self.lookback_days * 6:
            print(f"Lỗi: Số lượng features không đúng. Mong đợi {self.lookback_days * 6}, nhận được {len(latest_data)}")
            return None
        
        try:
            # Chuẩn hóa
            latest_scaled = self.scaler.transform([latest_data])
            
            # Dự đoán hướng
            direction_pred = self.model.predict(latest_scaled)[0]
            direction_proba = self.model.predict_proba(latest_scaled)[0]
            
            # Dự đoán giá
            price_pred = self.price_model.predict(latest_scaled)[0]
            current_price = float(self.data['Close'].iloc[-1])
            
            # Tính toán dự đoán
            predicted_return = (price_pred - current_price) / current_price
            confidence = np.max(direction_proba)
            
            return {
                'current_price': current_price,
                'predicted_price': price_pred,
                'predicted_return': predicted_return,
                'direction': direction_pred,
                'confidence': confidence,
                'probabilities': direction_proba
            }
        except Exception as e:
            print(f"Lỗi khi dự đoán: {e}")
            return None

    def get_investment_advice(self, prediction):
        """Đưa ra gợi ý đầu tư"""
        if prediction is None:
            return "Không thể đưa ra gợi ý do thiếu dữ liệu dự đoán"
        
        direction = prediction['direction']
        confidence = prediction['confidence']
        predicted_return = prediction['predicted_return']
        print(f"DEBUG: direction={direction}, confidence={confidence}, predicted_return={predicted_return}")

        # Gợi ý dựa trên hướng dự đoán và độ tin cậy
        if direction == 2 and confidence > 0.35:  # Dự đoán tăng với độ tin cậy vừa phải
            if predicted_return > 0.02:
                return "ĐẦU TƯ - Cơ hội tăng giá với mức độ rủi ro cao hơn"
            else:
                return "ĐẦU TƯ - Có tín hiệu tăng giá nhẹ, rủi ro cao"
        elif direction == 0 and confidence > 0.35:  # Dự đoán giảm với độ tin cậy vừa phải
            return "KHÔNG NÊN ĐẦU TƯ - Nguy cơ giảm giá (rủi ro cao)"
        elif direction == 1:
            # Stable: provide more nuanced advice
            if confidence > 0.5:
                return "KHÔNG KHUYẾN NGHỊ - Thị trường dự báo ổn định, nên giữ vị thế hiện tại"
            elif abs(predicted_return) < 0.01:
                return "KHÔNG KHUYẾN NGHỊ - Biến động dự đoán rất nhỏ, nên quan sát thêm"
            else:
                return "KHÔNG NÊN ĐẦU TƯ - Thị trường có thể dao động trong khoảng hẹp"
        elif confidence < 0.2:
            return "KHÔNG NÊN ĐẦU TƯ - Độ tin cậy rất thấp, thị trường không rõ ràng"
        else:
            return "KHÔNG NÊN ĐẦU TƯ - Thị trường có thể dao động trong khoảng hẹp"
    
    def get_direction_text(self, direction):
        """Chuyển đổi số direction thành text"""
        if direction == 0:
            return "Decrease (Sell)"
        elif direction == 1:
            return "Stable (Hold)"
        else:
            return "Increase (Buy)"
    
    def run_prediction(self):
        """Chạy toàn bộ quy trình dự đoán (simplified for API use)"""
        print(f"=== DỰ ĐOÁN CỔ PHIẾU {self.symbol} ===")
        
        # Lấy dữ liệu
        if not self.fetch_data():
            return None
        
        # Huấn luyện mô hình
        if not self.train_model():
            return None
        
        # Dự đoán
        prediction = self.predict_next_day()
        
        if prediction:
            print(f"\n=== KẾT QUẢ DỰ ĐOÁN ===")
            print(f"Giá hiện tại: ${prediction['current_price']:.2f}")
            print(f"Giá dự đoán ngày mai: ${prediction['predicted_price']:.2f}")
            print(f"Biến động dự đoán: {prediction['predicted_return']:.2%}")
            print(f"Độ tin cậy: {prediction['confidence']:.2%}")
            
            print(f"\nXác suất cho các kịch bản:")
            print(f"- Giảm mạnh (>1.5%): {prediction['probabilities'][0]:.2%}")
            print(f"- Ổn định (±1.5%): {prediction['probabilities'][1]:.2%}")
            print(f"- Tăng mạnh (>1.5%): {prediction['probabilities'][2]:.2%}")
            
            # Gợi ý đầu tư
            advice = self.get_investment_advice(prediction)
            print(f"\n=== GỢI Ý ĐẦU TƯ ===")
            print(advice)
            
            print(f"\n=== CẢNH BÁO ===")
            print("Đây chỉ là mô hình dự đoán dựa trên dữ liệu lịch sử.")
            print("Không nên sử dụng làm cơ sở duy nhất cho quyết định đầu tư.")
            print("Luôn cân nhắc nhiều yếu tố khác và có chiến lược quản lý rủi ro.")
            
            return prediction
        
        return None

# Sử dụng
if __name__ == "__main__":
    # Thay đổi mã cổ phiếu tại đây
    symbol = input("Nhập mã cổ phiếu (VD: AAPL, GOOGL, TSLA): ").upper()
    
    # Có thể điều chỉnh số ngày lookback
    predictor = StockPredictor(symbol, lookback_days=10)
    predictor.run_prediction()