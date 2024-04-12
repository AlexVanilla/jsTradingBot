'use strict'

const Papa = require('papaparse');
const fs = require('fs');
const api = require('./zackCall')
const summary = require('./summaryReport')
const alpaca = require('./alpaca')
const tv = require('./tradingView')
const helpers = require('./helpers')
const tulind = require('tulind');

require('dotenv').config()

// ALGO Strategy - use RSI and buy only if close price is under 100 SMA

const main = async () => {
    console.log('started')
    console.log('Is market open?', await alpaca.getMarketStatus());
    // Init the stocks to prevent too many requests being sent
    // let test = helpers.parseCSV('./newWatchlist.csv')
    // let symbols = test.data.map(symbol => symbol.symbol)
    let symbols = ['MSFT']
    // console.log(symbols)

    setInterval(async () => {
        console.log('Is market open?', await alpaca.getMarketStatus());

        // Note 5Min is also the same timeframe robinhood updates their price actions
        let results = await alpaca.getBars(symbols, 1000, '5Min')

        let barObj = {}
        for (const symbol in results) {
            let bars = results[symbol]
            barObj[symbol] = {
                open: [],
                high: [],
                low: [],
                close: [],
                volume: [],
                epochTime: []
            }
            for (let i = 0; i < bars.length; i++) {
                barObj[symbol].open.push(bars[i].o)
                barObj[symbol].high.push(bars[i].h)
                barObj[symbol].low.push(bars[i].l)
                barObj[symbol].close.push(bars[i].c)
                barObj[symbol].volume.push(bars[i].v)
                barObj[symbol].epochTime.push(bars[i].t)
            }

            // console.log(barObj)
        }

        // filter out stocks if it's penny stock or if prices aren't found
        let toFilter = []
        for (const symbol in barObj) {
            let closePrices = barObj[symbol].close

            // If closePrices are not found, remove the symbol from list of symbols to evalatuate
            if (closePrices.length == 0 || !closePrices) {
                // symbols = symbols.filter(el => el != symbol)
                console.log(`${symbol} close prices not found`)
                toFilter.push(symbol)
            }

            // Remove penny stocks
            let lastClosePrice = closePrices[closePrices.length - 1]
            if (lastClosePrice < 5) {
                console.log(`${symbol}'s close price is too low.  Removing from list.  Last Close price:  ${lastClosePrice}`)
                // symbols = symbols.filter(el => el != symbol)
                toFilter.push(symbol)
            }
        }

        for (const symbol of toFilter) {
            delete barObj[symbol]
        }

        // ALGORITHM
        // Iterate through barObj
        // Take RSI, if below 30 and is below 100 day SMA, and not in our portfolio, buy stock
        // If RSI is over 70 and in our portfolio, sell it

        // for (const symbol in barObj) {
        let toBuy = []
        for (let symbol in barObj) {
            let closePrices = barObj[symbol].close
            let lastClosePrice = closePrices[closePrices.length - 1]

            let latestRSI
            tulind.indicators.rsi.indicator([closePrices], [14], async function (err, results) {
                latestRSI = results[0][results[0].length - 1]
            })

            let sma100
            tulind.indicators.sma.indicator([closePrices], [100], async function (err, results) {
                sma100 = results[0][results[0].length - 1]
            })

            console.log(`${symbol}:  Close Price: ${lastClosePrice};    RSI ${latestRSI};   SMA ${sma100}`)

            // BUYING ALGO
            if (latestRSI < 30 && lastClosePrice < sma100) {
                console.log(`${symbol} RSI IS LOW: ${latestRSI}`)
                console.log(`${symbol} CLOSE PRICE IS LOWER THAN 100 DAY SMA:  ${lastClosePrice} ; ${sma100}`)
                toBuy.push(symbol)

                // check if stock is in portfolio
                let positions = await alpaca.getPositions()
                let filtered = positions.filter(el => el.symbol === symbol)

                // check if there's an open order already
                let orders = await alpaca.getOpenOrders()
                let filteredOrders = orders.filter(el => el.symbol === symbol)
                
                // Check if have enough buy power
                let account = await alpaca.getAccount()

                // If not found in positions, open orders, and have enough buy power (have each trade $1000 at a time), buy the stock
                if (!filtered[0] && !filteredOrders[0] && lastClosePrice < account.buying_power && account.buying_power > 1000) {
                    console.log(`${symbol} - BUYING STOCK`)
                    console.log(new Date())

                    // TODO: create stop loss order
                    // await alpaca.createMarketBuyOrder(symbol, 1)
                    let quantity = Math.floor(1000 / lastClosePrice)
                    await alpaca.createMarketBuyOrder(symbol, quantity)
                    // await alpaca.createMarketBuyStopLimitOrder(symbol, quantity, lastClosePrice)
                }
            }

            // SELLING ALGO
            // If RSI above 70, check if in portfolio, if so, sell all stocks
            if (latestRSI >= 70) {
                console.log(`${symbol} RSI IS HIGH: ${latestRSI}`)
                // check if stock is in portfolio
                let positions = await alpaca.getPositions()
                let filteredPosition = positions.filter(el => el.symbol === symbol)

                // check if there's an open order already
                let orders = await alpaca.getOpenOrders()


                // FIXME: make sure to filter only sell types
                let filteredOrders = orders.filter(el => el.symbol === symbol)

                // If in found positions, sell stock
                // TODO: need to get day purchased.  if another day, sell it
                if (filteredPosition[0] && !filteredOrders[0]) {
                    let position = filteredPosition[0]
                    console.log(`${symbol} - SELLING STOCK`)
                    console.log(new Date())
                    // TODO: create/update stop loss order
                    await alpaca.createMarketSellOrder(symbol, position.qty)
                }
            }

        }

        // Console log to buy stocks
        console.log('--------------- TO BUY ---------------')
        console.log(toBuy)

        // check if market is open, if not reset the bought status for stocks

    // }, (5 * 1000) * 60) // run every 5min
    }, 20000) // run every 5min
}
main()