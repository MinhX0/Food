async function updatePriceTicker() {
  try {
    const response = await getRequest("/ticker_status");
    if (!response || !response.tickers) {
      console.error('No ticker data received');
      return;
    }

    const tickerContainer = document.getElementById('priceTicker');
    if (!tickerContainer) {
      console.error('Ticker container not found');
      return;
    }

    let tickerContent = '';
    response.tickers.forEach(ticker => {
      if (ticker.price !== null && ticker.change_percent !== null) {
        const price = parseFloat(ticker.price);
        const formattedPrice = price.toLocaleString('en-US', {
          style: 'currency',
          currency: ticker.symbol.toLowerCase().endsWith('.vn') ? 'VND' : 'USD',
          maximumFractionDigits: ticker.symbol.toLowerCase().endsWith('.vn') ? 0 : 2
        });
        const changeSign = ticker.change_percent >= 0 ? '▲' : '▼';
        const direction = ticker.change_percent >= 0 ? 'UP' : 'DOWN';
        const tickerClass = ticker.change_percent >= 0 ? 'up' : 'down';
        
        tickerContent += `
          <div class="ticker-item ${tickerClass}">
            <span class="symbol">${ticker.symbol}</span>
            <span class="arrow">${changeSign}</span>
            <span>${direction} (${Math.abs(ticker.change_percent).toFixed(2)}%)</span>
          </div>`;
      }
    });

    // Double the content for seamless looping
    tickerContent = tickerContent + tickerContent;
    tickerContainer.innerHTML = tickerContent;

    console.log('Ticker updated with', response.tickers.length, 'stocks');
  } catch (error) {
    console.error('Error updating price ticker:', error);
  }
}

function startTickerUpdates() {
  // Initial update
  updatePriceTicker();
  
  // Update every 15 seconds
  setInterval(() => {
    updatePriceTicker();
  }, 15000);
}

async function getPinned_Tickers() {
  const tbody = document.getElementById("stockTableBody");
  if (!tbody) return;

  try {
    showLoading();
    // Lấy danh sách mã yêu thích
    const preferences = await getRequest("/get_preferences");
    if (preferences && preferences.preferences) {
      console.log("Mã yêu thích:", preferences.preferences);

      // Lấy thông tin chi tiết cho các mã yêu thích
      const batchInfo = await getBatchTickerInfo(preferences.preferences);
      if (batchInfo && batchInfo.data) {
        console.log("Thông tin chi tiết mã yêu thích:", batchInfo.data);
        // Render dữ liệu
        renderStocks(batchInfo.data, "stockTableBody");
      }
      hideLoading();
      return batchInfo?.data || [];
    }
  } catch (error) {
    console.error("Lỗi trong getPinned_Tickers:", error);
    hideLoading();
    return [];
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  // Initialize price ticker
  startTickerUpdates();
  
  // Tải dữ liệu cổ phiếu đã ghim
  await getPinned_Tickers();
  
  // 2. Chức năng tìm kiếm cổ phiếu
  const setupStockSearch = async () => {
    const stockSearch = document.getElementById("stockSearch");
    const searchResults = document.getElementById("searchResults");

    if (stockSearch && searchResults) {
      // Ẩn block kết quả tìm kiếm ban đầu
      const searchBlock = document.querySelector(
        ".bg-white.p-6.rounded-lg.shadow-md.mt-8"
      );
      if (searchBlock) searchBlock.style.display = "none";

      stockSearch.addEventListener("focus", () => {
        if (searchBlock) searchBlock.style.display = "none";
      });
      stockSearch.addEventListener("keydown", async (event) => {
        if (event.key === "Enter") {
          const keyword = stockSearch.value.trim().toUpperCase();
          if (keyword) {
            // Gọi API, ví dụ:
            const response = await getRequest(
              `/ticker_data?symbol=${encodeURIComponent(keyword)}`
            );
            if (searchBlock) searchBlock.style.display = "block";
            if (response && response.data && response.data.length > 0) {
              searchResults.style.display = "block";
              const lastDay = response.data[response.data.length - 1];
              const symbol = response.symbol; // VD: "AAPL"

              const closeKey = `('Close', '${symbol}')`; // tạo key động
              const returnKey = "('Returns', '')"; // tạo key động
              const retVal = lastDay[returnKey];
              let indicator = "NO_CHANGE";
              if (retVal > 0) indicator = "UP";
              else if (retVal < 0) indicator = "DOWN";
              const obj = {
                symbol: symbol,
                company_name: response.company_name,
                price: lastDay[closeKey],
                return: retVal != null ? retVal * 100 : null,
                indicator: indicator,
              };
              console.log(obj);

              const tbody = document.getElementById("stockTableBodySearch");
              tbody.innerHTML = "";

              const row = document.createElement("tr");
              row.className = "border-t";
              let changeDisplay = "";
              let changeColor = "";
              if (indicator === "UP") {
                changeDisplay = `▲ UP (${obj.return > 0 ? "+" : ""}${
                  obj.return != null ? obj.return.toFixed(2) : "0.00"
                }%)`;
                changeColor = "text-green-600";
              } else if (indicator === "DOWN") {
                changeDisplay = `▼ DOWN (${obj.return < 0 ? "" : ""}${
                  obj.return != null ? obj.return.toFixed(2) : "0.00"
                }%)`;
                changeColor = "text-red-600";
              } else {
                changeDisplay = `▬ NO_CHANGE (${
                  obj.return != null ? obj.return.toFixed(2) : "0.00"
                }%)`;
                changeColor = "text-gray-600";
              }

              row.innerHTML = `
      <td class="px-4 py-2 text-center align-middle" style="width:60px">
        <button class="pin-btn text-gray-400 hover:text-blue-600" data-pinned="false">
          <i class="fas fa-thumbtack"></i>
        </button>
      </td>
      <td class="px-4 py-2 font-bold text-center align-middle" style="width:120px"><a href="ticker.html?symbol=${
        obj.symbol
      }" class="text-blue-700 hover:underline">${obj.symbol}</a></td>
      <td class="px-4 py-2 text-center align-middle" style="width:320px">${
        obj.company_name
      }</td>
      <td class="px-4 py-2 text-center align-middle" style="width:120px">${
        obj && obj.price != null
          ? obj.price.toLocaleString('en-US', {
              style: 'currency',
              currency: obj.symbol.toLowerCase().endsWith(".vn") ? 'VND' : 'USD',
              maximumFractionDigits: obj.symbol.toLowerCase().endsWith(".vn") ? 0 : 2
            })
          : "N/A"
      }</td>
      <td class="px-4 py-2 ${changeColor} text-center align-middle" style="width:120px">${changeDisplay}</td>
    `;

              tbody.appendChild(row);
              handleBtnPin();
            } else {
              searchResults.style.display = "block";
              searchResults.innerHTML =
                '<div class="p-4 text-center text-gray-500">Không tìm thấy mã cổ phiếu.</div>';
            }
          } else {
            if (searchBlock) searchBlock.style.display = "none";
            searchResults.style.display = "none";
          }
        }
      });
    }
  };
  // 👉 Khi trang tải, lấy preferences từ API và render vào pinnedStocks
  async function loadPinnedStocks() {
    const pinnedContainer = document.getElementById("pinnedStocks");
    if (!pinnedContainer) return;
    pinnedContainer.innerHTML = "";
    try {
      const res = await fetch("http://localhost:8000/get_preferences");
      const data = await res.json();
      if (data && Array.isArray(data.preferences)) {
        for (const symbol of data.preferences) {
          // Gọi API lấy thông tin mã cổ phiếu
          const infoRes = await fetch(`http://localhost:8000/ticker_status`);
          const infoData = await infoRes.json();
          let stock = infoData.tickers.find((t) => t.symbol === symbol);
          let changeHTML = "";
          if (stock) {
            const indicator = stock.indicator.toUpperCase();
            if (indicator === "UP") {
              changeHTML = `▲ UP (${stock.change_percent > 0 ? "+" : ""}${
                stock.change_percent != null
                  ? stock.change_percent.toFixed(2)
                  : "0.00"
              }%)`;
            } else if (indicator === "DOWN") {
              changeHTML = `▼ DOWN (${stock.change_percent < 0 ? "" : ""}${
                stock.change_percent != null
                  ? stock.change_percent.toFixed(2)
                  : "0.00"
              }%)`;
            } else {
              changeHTML = `▬ NO_CHANGE (${
                stock.change_percent != null
                  ? stock.change_percent.toFixed(2)
                  : "0.00"
              }%)`;
            }
          }
          const pinnedItem = document.createElement("div");
          pinnedItem.className = "pinned-stock bg-gray-700 px-3 py-2 rounded-lg flex items-center gap-2 text-sm";
          pinnedItem.innerHTML = `
            <span class="flex items-center"><strong class="text-green-400">${symbol}</strong> <span class="ml-2 text-gray-300">${changeHTML}</span></span>
            <i class="fas fa-times text-gray-400 hover:text-red-600 cursor-pointer unpin-btn ml-2"></i>
          `;
          pinnedContainer.appendChild(pinnedItem);
          pinnedItem
            .querySelector(".unpin-btn")
            .addEventListener("click", async () => {
              pinnedItem.remove();

              // Tìm và cập nhật trạng thái nút pin tương ứng trong bảng
              document.querySelectorAll(".pin-btn").forEach((btn) => {
                const row = btn.closest("tr");
                const btnSymbol = row.children[1].textContent.trim();
                if (btnSymbol === symbol) {
                  updatePinButtonState(btn, false);
                }
              });

              // Gọi API xóa preference
              await fetch("http://localhost:8000/remove_preference", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ symbol }),
              });

              // Cập nhật lại trạng thái tất cả các nút
              handleBtnPin();
            });
        }
      }
    } catch (err) {
      console.error("Error loading pinned stocks:", err);
    }
  }
  //Xử lí nút xóa khỏi gần đây
  document
    .querySelectorAll(".custom-scrollbar span i.fas.fa-times")
    .forEach((closeBtn) => {
      closeBtn.addEventListener("click", () => {
        const item = closeBtn.closest("span");
        item.remove();
      });
    });

  handleBtnPin();

  // Hàm cập nhật trạng thái nút pin
  function updatePinButtonState(btn, isPinned) {
    if (isPinned) {
      btn.setAttribute("data-pinned", "true");
      btn.classList.remove("text-gray-400");
      btn.classList.add("text-blue-600");
    } else {
      btn.setAttribute("data-pinned", "false");
      btn.classList.remove("text-blue-600");
      btn.classList.add("text-gray-400");
    }
  }

  async function handlePinUnpin(btn, symbol) {
    const isPinned = btn.getAttribute('data-pinned') === 'true';

    if (isPinned) {
      // Gỡ ghim
      await fetch("http://localhost:8000/remove_preference", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol }),
      });
      // Remove the row from the pinned stocks table if it exists
      const pinnedTableRow = document.querySelector(`#stockTableBody tr td a[href="ticker.html?symbol=${symbol}"]`)?.closest('tr');
      if (pinnedTableRow) {
        pinnedTableRow.remove();
      }
      // Cập nhật trạng thái nút sau khi gỡ ghim
      updatePinButtonState(btn, false);
    } else {
      // Ghim
      await fetch("http://localhost:8000/save_preference", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol }),
      });
      
      // Cập nhật trạng thái nút sau khi ghim
      updatePinButtonState(btn, true);
      
      // Refresh the pinned stocks table
      await getPinned_Tickers();
    }
  }

  async function handleBtnPin() {
    // Get current pinned preferences
    const preferences = await getRequest("/get_preferences");
    const pinnedSymbols = preferences?.preferences || [];

    document.querySelectorAll(".pin-btn").forEach((btn) => {
      const row = btn.closest("tr");
      const symbol = row.children[1].textContent.trim();
      // Nếu đã ghim thì cập nhật trạng thái nút
      if (pinnedSymbols.includes(symbol)) {
        btn.setAttribute("data-pinned", "true");
        btn.classList.remove("text-gray-400");
        btn.classList.add("text-blue-600");
      } else {
        btn.setAttribute("data-pinned", "false");
        btn.classList.remove("text-blue-600");
        btn.classList.add("text-gray-400");
      }
      btn.onclick = async () => {
        await handlePinUnpin(btn, symbol);
        // Gọi lại handleBtnPin để cập nhật trạng thái tất cả các nút
        await handleBtnPin();
      };
    });
  }

  async function renderStocks(stockData, elementInnerHTML = "stockTableBody") {
    const tbody = document.getElementById(elementInnerHTML);
    if (!tbody) return;
    tbody.innerHTML = "";

    // Get current pinned preferences
    const preferences = await getRequest("/get_preferences");
    const pinnedSymbols = preferences?.preferences || [];

    stockData.forEach((stock) => {
      const row = document.createElement("tr");
      row.className = "border-t";
      const indicator = stock.indicator.toUpperCase();
      let changeDisplay = "";
      let changeColor = "";
      if (indicator === "UP") {
        changeDisplay = `▲ UP (${stock.change_percent > 0 ? "+" : ""}${
          stock.change_percent != null
            ? stock.change_percent.toFixed(2)
            : "0.00"
        }%)`;
        changeColor = "text-green-600";
      } else if (indicator === "DOWN") {
        changeDisplay = `▼ DOWN (${stock.change_percent < 0 ? "" : ""}${
          stock.change_percent != null
            ? stock.change_percent.toFixed(2)
            : "0.00"
        }%)`;
        changeColor = "text-red-600";
      } else {
        changeDisplay = `▬ NO_CHANGE (${
          stock.change_percent != null
            ? stock.change_percent.toFixed(2)
            : "0.00"
        }%)`;
        changeColor = "text-gray-600";
      }

      // Kiểm tra xem mã này đã được ghim chưa
      const isPinned = pinnedSymbols.includes(stock.symbol);
      const pinButtonClass = isPinned ? "text-blue-600" : "text-gray-400";

      row.innerHTML = `
      <td class="px-4 py-2 text-center align-middle" style="width:60px">
        <button class="pin-btn ${pinButtonClass} hover:text-blue-600" data-pinned="${isPinned}">
          <i class="fas fa-thumbtack"></i>
        </button>
      </td>
      <td class="px-4 py-2 font-bold text-center align-middle" style="width:120px"><a href="ticker.html?symbol=${
        stock.symbol
      }" class="text-blue-700 hover:underline">${stock.symbol}</a></td>
      <td class="px-4 py-2 text-center align-middle" style="width:320px">${
        stock.company_name
      }</td>
      <td class="px-4 py-2 text-center align-middle" style="width:120px">${
        stock && stock.price != null
          ? stock.price.toLocaleString('en-US', {
              style: 'currency',
              currency: stock.symbol.toLowerCase().endsWith(".vn") ? 'VND' : 'USD',
              maximumFractionDigits: stock.symbol.toLowerCase().endsWith(".vn") ? 0 : 2
            })
          : "N/A"
      }</td>
      <td class="px-4 py-2 ${changeColor} text-center align-middle" style="width:120px">${changeDisplay}</td>
    `;

      tbody.appendChild(row);
      handleBtnPin();
    });

    // Chỉ gọi handleBtnPin để gán event cho các nút pin
    handleBtnPin();
  }

  async function getPinned_Tickers() {
    const tbody = document.getElementById("stockTableBody");
    if (!tbody) return;
    try {
      // Get pinned tickers from preferences
      const preferences = await getRequest("/get_preferences");
      if (preferences && preferences.preferences) {
        // Get detailed info for pinned tickers
        const batchInfo = await getBatchTickerInfo(preferences.preferences);
        if (batchInfo && batchInfo.data) {
          console.log("Pinned tickers info:", batchInfo.data);
          renderStocks(batchInfo.data, "stockTableBody");
        }
        return batchInfo?.data || [];
      }
      return [];
    } catch (error) {
      console.error("Error in getPinned_Tickers:", error);
      return [];
    }
  }

  getPinned_Tickers();

  // 3. Gọi hàm khởi tạo
  setupStockSearch();

  async function loadTickers() {
    const data = await getRequest("/ticker_status");
    const listTickerStatus = data.tickers;
    if (listTickerStatus) {
      renderStocks(listTickerStatus, "stockTableBodyAll");
      handleBtnPin();
    }
  }
  loadTickers();
  loadPinnedStocks();
});
