if (keyword.length > 0 && window.stockList) {
          const filtered = window.stockList.filter(
            (stock) =>
              stock.symbol.toLowerCase().includes(keyword) ||
              stock.company.toLowerCase().includes(keyword)
          );
          if (filtered.length > 0) {
            searchResults.innerHTML = filtered
              .map(
                (stock) => `
                            <div class="p-3 hover:bg-gray-100 cursor-pointer flex justify-between items-center">
                                <span><strong>${stock.symbol}</strong> - ${stock.company}</span>
                                <button class="pin-btn text-gray-400 hover:text-red-500" data-symbol="${stock.symbol}">
                                    <i class="fas fa-thumbtack"></i>
                                </button>
                            </div>
                        `
              )
              .join("");
            searchResults.classList.remove("hidden");
          } else {
            searchResults.innerHTML = `<div class="p-3 text-gray-500">Không tìm thấy kết quả</div>`;
            searchResults.classList.remove("hidden");
          }
        } else {
          searchResults.classList.add("hidden");
          searchResults.innerHTML = "";
        }

        // Attach pin event listeners for search results
        searchResults.querySelectorAll(".pin-btn").forEach((btn) => {
          btn.addEventListener("click", (e) => {
            e.stopPropagation();
            const symbol = btn.getAttribute("data-symbol");
            const stock = window.stockList.find((s) => s.symbol === symbol);
            if (!stock) return;
            const up = stock.change >= 0;
            const changeDisplay = `${up ? "▲ UP" : "▼ DOWN"} (${
              stock.change > 0 ? "+" : ""
            }${stock.change}%)`;
            const changeColor = up ? "text-green-600" : "text-red-600";
            const changeHTML = `<span class='${changeColor}'>${changeDisplay}</span>`;

            const pinnedContainer = document.getElementById("pinnedStocks");
            const pinnedItems = Array.from(pinnedContainer.children);
            const existingItem = pinnedItems.find((item) =>
              item.textContent.includes(symbol)
            );
            if (existingItem) {
              existingItem.remove();
              btn.setAttribute("data-pinned", "false");
              btn.classList.remove("text-blue-600");
              btn.classList.add("text-gray-400");
            } else {
              const pinnedItem = document.createElement("div");
              pinnedItem.className = "pinned-stock flex items-center gap-2";
              pinnedItem.innerHTML = `
                                <span><strong>${symbol}</strong> ${changeHTML}</span>
                                <i class="fas fa-times text-gray-400 hover:text-red-600 cursor-pointer unpin-btn"></i>
                            `;
              pinnedContainer.appendChild(pinnedItem);
              pinnedItem
                .querySelector(".unpin-btn")
                .addEventListener("click", () => {
                  pinnedItem.remove();
                  btn.setAttribute("data-pinned", "false");
                  btn.classList.remove("text-blue-600");
                  btn.classList.add("text-gray-400");
                });
              btn.setAttribute("data-pinned", "true");
              btn.classList.remove("text-gray-400");
              btn.classList.add("text-blue-600");
            }
          });
        });