/**
 * Currency formatting utilities for the stock application
 */

// Currency formatting function
function formatCurrency(price, currency) {
    if (price === null || price === undefined || isNaN(price)) {
        return 'N/A';
    }
    
    const numPrice = parseFloat(price);
    
    switch (currency) {
        case 'VND':
            return `${numPrice.toLocaleString('vi-VN', { maximumFractionDigits: 0 })} ₫`;
        case 'USD':
            return `$${numPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        case 'EUR':
            return `€${numPrice.toLocaleString('en-EU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        case 'GBP':
            return `£${numPrice.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        case 'JPY':
            return `¥${numPrice.toLocaleString('ja-JP', { maximumFractionDigits: 0 })}`;
        case 'CAD':
            return `C$${numPrice.toLocaleString('en-CA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        case 'AUD':
            return `A$${numPrice.toLocaleString('en-AU', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        case 'HKD':
            return `HK$${numPrice.toLocaleString('en-HK', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        case 'SGD':
            return `S$${numPrice.toLocaleString('en-SG', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        case 'CHF':
            return `CHF${numPrice.toLocaleString('de-CH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
        default:
            return `${numPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
    }
}

// Get currency from stock symbol
function getCurrencyFromSymbol(symbol) {
    const upperSymbol = symbol.toUpperCase();
    
    if (upperSymbol.endsWith('.VN')) return 'VND';
    if (upperSymbol.endsWith('.HK')) return 'HKD';
    if (upperSymbol.endsWith('.L') || upperSymbol.endsWith('.LON')) return 'GBP';
    if (upperSymbol.endsWith('.TO') || upperSymbol.endsWith('.TSE')) return 'CAD';
    if (upperSymbol.endsWith('.SI')) return 'SGD';
    if (upperSymbol.endsWith('.AX')) return 'AUD';
    if (upperSymbol.endsWith('.T') || upperSymbol.endsWith('.JP')) return 'JPY';
    if (upperSymbol.endsWith('.DE') || upperSymbol.endsWith('.F')) return 'EUR';
    if (upperSymbol.endsWith('.PA')) return 'EUR';
    if (upperSymbol.endsWith('.SW')) return 'CHF';
    
    return 'USD'; // Default
}

// Smart price formatting - use API formatted price if available, otherwise format ourselves
function formatPrice(priceData) {
    if (priceData.formatted_price) {
        return priceData.formatted_price;
    }
    
    if (priceData.price !== null && priceData.price !== undefined) {
        const currency = priceData.currency || getCurrencyFromSymbol(priceData.symbol || '');
        return formatCurrency(priceData.price, currency);
    }
    
    return 'N/A';
}

// Currency symbols mapping
const CURRENCY_SYMBOLS = {
    'VND': '₫',
    'USD': '$',
    'EUR': '€',
    'GBP': '£',
    'JPY': '¥',
    'CAD': 'C$',
    'AUD': 'A$',
    'HKD': 'HK$',
    'SGD': 'S$',
    'CHF': 'CHF'
};

// Get currency symbol
function getCurrencySymbol(currency) {
    return CURRENCY_SYMBOLS[currency] || currency;
}
