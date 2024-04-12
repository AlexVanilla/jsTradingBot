'use strict'

const Papa = require('papaparse');
const fs = require('fs');
const api = require('./zackCall')
const summary = require('./summaryReport')
const alpaca = require('./alpaca')
const tv = require('./tradingView')
const helpers = require('./helpers')
const tulind = require('tulind');

// TODO: format
require('dotenv').config()

// This is for evalutating TradingView csv sheets from stock screener, make sure tratings are 'STRONG BUY'

const main = async () => {
    console.log('started')
    console.log('Is market open?', await alpaca.getMarketStatus());
    // Evaluating every possible asset might not be best since we still send to many request for buying.  Prob best to select only certain ones
    // Init the stocks to prevent too many requests being sent
    // Outputs an object with each property the symbol
    // let assets = await alpaca.getAssets()
    // let symbols = []
    // for (let stock of assets) {
    //     symbols.push(stock.symbol)
    // }
    // symbols.length = 200

    let symbols = ['MSFT, AMZN', 'AAPL', 'NFLX', 'CPB', 'SMG', 'AEYE', 'GO', 'CLX', 'LOGI', 'BGS', 'SJM', 'AHCO', 'PSN', 'FB', 'SBUX', ]

    //TODO: find way to parse all of assets (get bars is limited to 200 symbols.  All compatible assets to trade are around 8,600 symbols)

    // filter the parsed assets (take out if penny stock.  need to get latest closed price)
    // not sure if able to use alpaca.getLatestPrice as that might be too many requests

    // store this information somewhere, so it doesn't have to make the api call again.  we can refresh the list buy deleting it and running the call again

    setInterval(async () => {
        console.log('Is market open?', await alpaca.getMarketStatus());

        // TODO: experimenting with one stock.  Try with some more later
        let results = await alpaca.getBars(['FULC'], 1000, '5Min')
        // let results = await alpaca.getBars(['FULC'], 5, '5Min')
        // let results = await alpaca.getBars([symbols], 1000, '5Min')

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

            console.log(barObj)
        }

        for (const symbol in barObj) {
            let closePrices = barObj[symbol].close

            // If closePrices are not found, remove the symbol from list of symbols to evalatuate
            if(!closePrices) {
                symbols = symbols.filter(el => el != symbol)
                break 
            }

            // Remove penny stocks
            if(closePrices[closePrices.length -1] < 10) {
                console.log(symbol, 'close is too low.  removing from list', closePrices)
                symbols = symbols.filter(el => el != symbol)
                break 
            }

            console.log(symbol, closePrices[closePrices.length - 1])

            // Using 5-period
            console.log(tulind.indicators.macd.indicator)
            tulind.indicators.rsi.indicator([barObj[symbol].close], [5], async function (err, results) {
                let latestRSI = results[0][results[0].length - 1]
                console.log('rsi', symbol, results[0][results[0].length - 1])

                // If RSI is below 30, check if already bought for today, if not , buy 1 stock
                if (latestRSI <= 30) {
                    // TODO: maybe also only buy if zack rank 1, if zack rank not found, filter that out

                    // check if stock is in portfolio, if not buy it
                    let positions = await alpaca.getPositions()
                    let filtered = positions.filter(el => el.symbol === symbol)

                    // If not found in positions, buy the stock
                    if (!filtered[0]) {
                        console.log(symbol, 'buying stock')
                        console.log(new Date())
                        await alpaca.createMarketBuyOrder(symbol, 10)
                    }
                }

                // If RSI above 70, check if in portfolio, if so, sell all stocks
                if (latestRSI >= 70) {

                    // check if stock is in portfolio
                    let positions = await alpaca.getPositions()
                    let filtered = positions.filter(el => el.symbol === symbol)

                    // If in found positions, sell stock
                    if (filtered[0]) {
                        let position = filtered[0]
                        console.log('selling stock')
                        console.log(new Date())
                        await alpaca.createMarketSellOrder(symbol, position.qty)
                    }
                }
            })
        }

        // check if market is open, if not reset the bought status for stocks

    }, 1 * 1000) // run every 5min
}
main()