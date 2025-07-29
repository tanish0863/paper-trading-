// Initialize with ₹10,000 balance
let balance = 10000;
let portfolio = JSON.parse(localStorage.getItem('portfolio')) || [];

// DOM Elements
const balanceEl = document.getElementById('balance');
const symbolInput = document.getElementById('stockSymbol');
const sharesInput = document.getElementById('shares');
const portfolioTable = document.getElementById('portfolioTable');

// Update UI on load
updateUI();

// Fetch REAL-TIME NSE price (using Yahoo Finance API)
async function getLivePrice(symbol) {
    try {
        const response = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${symbol}.NS?interval=1m`);
        const data = await response.json();
        return data.chart.result[0].meta.regularMarketPrice.toFixed(2);
    } catch (error) {
        console.error("Error fetching price:", error);
        return null;
    }
}

// Place order with exact price values
async function placeOrder() {
    const symbol = symbolInput.value.trim().toUpperCase();
    const shares = parseInt(sharesInput.value);
    
    if (!symbol || !shares) {
        alert("Please enter both stock symbol and shares");
        return;
    }

    // Get LIVE price
    const currentPrice = await getLivePrice(symbol);
    if (!currentPrice) {
        alert("Could not fetch price. Check symbol or try later.");
        return;
    }

    // Get TP/SL prices from user (modified HTML needed)
    const takeProfit = parseFloat(prompt(`Enter Take Profit Price (Current: ₹${currentPrice})`));
    const stopLoss = parseFloat(prompt(`Enter Stop Loss Price (Current: ₹${currentPrice})`));
    
    if (!takeProfit || !stopLoss) {
        alert("Both Take Profit and Stop Loss prices are required");
        return;
    }

    const totalCost = shares * currentPrice;
    if (totalCost > balance) {
        alert(`Insufficient balance. Needed: ₹${totalCost.toFixed(2)}`);
        return;
    }

    // Add to portfolio
    portfolio.push({
        symbol: `${symbol}.NS`,
        shares,
        buyPrice: parseFloat(currentPrice),
        takeProfit,
        stopLoss,
        status: 'Active'
    });

    // Update balance and save
    balance -= totalCost;
    localStorage.setItem('portfolio', JSON.stringify(portfolio));
    localStorage.setItem('balance', balance);
    updateUI();
    alert(`Order placed for ${shares} shares of ${symbol} at ₹${currentPrice}`);
}

// Update portfolio table
function updateUI() {
    balanceEl.textContent = balance.toFixed(2);
    
    // Clear existing rows (except header)
    while (portfolioTable.rows.length > 1) {
        portfolioTable.deleteRow(1);
    }

    // Add portfolio items
    portfolio.forEach((item, index) => {
        const row = portfolioTable.insertRow();
        row.innerHTML = `
            <td>${item.symbol}</td>
            <td>${item.shares}</td>
            <td>₹${item.buyPrice.toFixed(2)}</td>
            <td>₹${item.takeProfit.toFixed(2)}</td>
            <td>₹${item.stopLoss.toFixed(2)}</td>
            <td><button onclick="sellStock(${index})">Sell</button></td>
        `;
    });
}

// Sell stock
async function sellStock(index) {
    const stock = portfolio[index];
    const currentPrice = await getLivePrice(stock.symbol.replace('.NS', ''));
    
    if (!currentPrice) {
        alert("Could not fetch current price");
        return;
    }

    const profit = (currentPrice - stock.buyPrice) * stock.shares;
    balance += currentPrice * stock.shares;
    
    portfolio.splice(index, 1);
    localStorage.setItem('portfolio', JSON.stringify(portfolio));
    localStorage.setItem('balance', balance);
    
    updateUI();
    alert(`Sold ${stock.symbol} at ₹${currentPrice}. ${profit >= 0 ? 'Profit' : 'Loss'}: ₹${Math.abs(profit).toFixed(2)}`);
}

// Auto-check prices every 30 seconds
setInterval(async () => {
    for (let i = 0; i < portfolio.length; i++) {
        const stock = portfolio[i];
        const currentPrice = await getLivePrice(stock.symbol.replace('.NS', ''));
        
        if (currentPrice >= stock.takeProfit || currentPrice <= stock.stopLoss) {
            await sellStock(i);
        }
    }
}, 30000);
  
