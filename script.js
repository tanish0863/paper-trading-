// Initialize balance and portfolio (saved in browser)
let balance = localStorage.getItem('paperBalance') || 10000;
let portfolio = JSON.parse(localStorage.getItem('paperPortfolio')) || [];

// Fetch NSE stock price (using Yahoo Finance API)
async function getNSEPrice(symbol) {
    try {
        const response = await fetch(
            `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}.NS?interval=1m`
        );
        const data = await response.json();
        return data.chart.result[0].meta.regularMarketPrice;
    } catch (error) {
        console.error("Failed to fetch price:", error);
        return null;
    }
}

// Place bracket order
async function placeOrder() {
    const symbol = document.getElementById('stockSymbol').value.toUpperCase();
    const shares = parseInt(document.getElementById('shares').value);
    const takeProfitPct = parseFloat(document.getElementById('takeProfit').value);
    const stopLossPct = parseFloat(document.getElementById('stopLoss').value);

    if (!symbol || !shares || !takeProfitPct || !stopLossPct) {
        alert("Please fill all fields!");
        return;
    }

    // Fetch real-time price
    const buyPrice = await getNSEPrice(symbol);
    if (!buyPrice) {
        alert("Invalid NSE symbol or API error.");
        return;
    }

    // Calculate TP/SL prices
    const takeProfitPrice = buyPrice * (1 + takeProfitPct / 100);
    const stopLossPrice = buyPrice * (1 - stopLossPct / 100);
    const totalCost = shares * buyPrice;

    if (totalCost > balance) {
        alert("Not enough balance!");
        return;
    }

    // Add to portfolio
    portfolio.push({
        symbol: `${symbol}.NS`,
        shares,
        buyPrice,
        takeProfitPrice,
        stopLossPrice,
        status: 'Active'
    });

    // Update balance and save
    balance -= totalCost;
    localStorage.setItem('paperBalance', balance);
    localStorage.setItem('paperPortfolio', JSON.stringify(portfolio));
    updateUI();

    // Send email notification (Step 4)
    sendEmail(symbol, shares, buyPrice, takeProfitPrice, stopLossPrice);
}

// Render portfolio
function updateUI() {
    document.getElementById('balance').textContent = balance.toLocaleString();
    const table = document.getElementById('portfolioTable');
    while (table.rows.length > 1) table.deleteRow(1);

    portfolio.forEach((trade, index) => {
        const row = table.insertRow();
        row.innerHTML = `
            <td>${trade.symbol}</td>
            <td>${trade.shares}</td>
            <td>${trade.buyPrice.toFixed(2)}</td>
            <td>${trade.takeProfitPrice.toFixed(2)}</td>
            <td>${trade.stopLossPrice.toFixed(2)}</td>
            <td><button onclick="sellStock(${index})">Sell</button></td>
        `;
    });
}

// Initialize
updateUI();
// Check prices every 30 seconds
setInterval(async () => {
    for (let i = 0; i < portfolio.length; i++) {
        const trade = portfolio[i];
        const currentPrice = await getNSEPrice(trade.symbol.replace('.NS', ''));
        
        if (currentPrice >= trade.takeProfitPrice || currentPrice <= trade.stopLossPrice) {
            sellStock(i, currentPrice);
        }
    }
}, 30000); // 30 seconds

function sendEmail(symbol, shares, buyPrice, takeProfitPrice, stopLossPrice) {
    // Initialize EmailJS (replace with your IDs)
    emailjs.init("9-OYwpxP8weW2Wz6x");
    
    emailjs.send("service_isx8vs1", "template_roequ0k", {
        symbol: symbol,
        shares: shares,
        buyPrice: buyPrice.toFixed(2),
        takeProfit: takeProfitPrice.toFixed(2),
        stopLoss: stopLossPrice.toFixed(2),
        recipient: "tanishmodgekar@gmail.com" // User's email (hardcode or prompt)
    }).then(() => {
        console.log("Email sent!");
    }, (error) => {
        console.error("Email failed:", error);
    });
}
