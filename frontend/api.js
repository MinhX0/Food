// Hiển thị và ẩn loading spinner
window.showLoading = function () {
  const spinner = document.getElementById("loadingSpinner");

  if (spinner) spinner.style.display = "flex";
};
window.hideLoading = function () {
  const spinner = document.getElementById("loadingSpinner");
  if (spinner) spinner.style.display = "none";
};

// Hàm lấy thông tin batch cho nhiều mã cổ phiếu
window.getBatchTickerInfo = async function (symbols) {
  if (!symbols || symbols.length === 0) {
    return { data: [] };
  }
  try {
    const data = await postRequest("/batch_ticker_info", symbols);
    if (!data) {
      throw new Error("Failed to fetch batch ticker info");
    }
    return data;
  } catch (error) {
    console.error("Error in getBatchTickerInfo:", error);
    throw error;
  }
};

// Hàm GET
const localhost = "http://localhost:8000";
const getRequest = async (url) => {
  url = localhost + url; // Thêm địa chỉ máy chủ vào URL
  console.log(url);
  showLoading();
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });
    if (!response.ok) {
      throw new Error(`GET thất bại: ${response.status}`);
    }
    const result = await response.json();
    hideLoading();
    return result;
  } catch (error) {
    console.error("Lỗi GET:", error);
    hideLoading();
    return null;
  }
};

// Wrap getRequest để tự động show/hide loading
if (window.getRequest) {
  const originalGetRequest = window.getRequest;
  window.getRequest = async function (...args) {
    showLoading();
    try {
      const result = await originalGetRequest.apply(this, args);
      return result;
    } finally {
      hideLoading();
    }
  };
}

// Hàm POST
const postRequest = async (url, data) => {
  url = localhost + url; // Thêm địa chỉ máy chủ vào URL
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`POST thất bại: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Lỗi POST:", error);
    return null;
  }
};
