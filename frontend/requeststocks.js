async function getSuggest_Tickers() {
  const tbody = document.getElementById("stockTableBodySuggest");
  if (!tbody) return;
  try {
    // Get similar tickers
    const similarTickers = await getRequest("/suggest_similar_tickers");
    console.log(similarTickers);

    if (similarTickers && similarTickers.suggested_tickers) {
      console.log("Similar tickers:", similarTickers.suggested_tickers);
      // Get detailed info for suggested tickers
      const batchInfo = await getBatchTickerInfo(similarTickers.suggested_tickers);
      if (batchInfo && batchInfo.data) {
        console.log("Detailed info for similar tickers:", batchInfo.data);
        renderStocks(batchInfo.data, "stockTableBodySuggest");
      }
    }
  } catch (error) {
    console.error("Error in getSuggest_Tickers:", error);
  }
}
