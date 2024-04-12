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

// planning to have this file list stocks that are under to buy with algorithm I had in mind
// Entry signal to buy is if close price is lower than 1M rsi, 9day sma, 180day sma, macd histogram is negative and below VWAP

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

    // let test = helpers.parseCSV('./watchlist.csv')
    let test = helpers.parseCSV('./newWatchlist.csv')
    let symbols = test.data.map(symbol => symbol.symbol)
    console.log(symbols)
    // let symbols = ['MSFT', 'AMZN', 'AAPL', 'OAS']

    //TODO: find way to parse all of assets (get bars is limited to 200 symbols.  All compatible assets to trade are around 8,600 symbols)

    // filter the parsed assets (take out if penny stock.  need to get latest closed price)
    // not sure if able to use alpaca.getLatestPrice as that might be too many requests

    // store this information somewhere, so it doesn't have to make the api call again.  we can refresh the list buy deleting it and running the call again

    // TODO: experimenting with one stock.  Try with some more later
    // let results = await alpaca.getBars(symbols, 1000, 'minute')
    // let results = await alpaca.getBars(symbols, 1000, 'minute')
    // let results = await alpaca.getBars(symbols, 1000, '1D')
    let results = await alpaca.getBars(symbols, 1000, '5Min')
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

    let toBuy = []
    let rsiPass = []
    let smaPass = []

    for (const symbol in barObj) {
        let closePrices = barObj[symbol].close
        let lastClosePrice = closePrices[closePrices.length - 1]

        let latestRSI
        tulind.indicators.rsi.indicator([closePrices], [14], async function (err, results) {
            latestRSI = results[0][results[0].length - 1]
        })

        // 100 day ema is considered solid to act as support/resistance levels

        let sma100
        tulind.indicators.sma.indicator([closePrices], [100], async function (err, results) {
            sma100 = results[0][results[0].length - 1]
        })


        if(latestRSI < 30 && lastClosePrice < sma100){
            toBuy.push(symbol)
        }

        // creating these checks for logging
        if(latestRSI < 30){
            console.log(`${symbol} RSI IS LOW:  ${latestRSI}`)
            rsiPass.push(symbol)
        }

        if(lastClosePrice < sma100){
            console.log(`${symbol} CLOSE PRICE IS LOWER THAN 100 SMA:  ${lastClosePrice} ; ${sma100}`)
            smaPass.push(symbol)
        }

        console.log(symbol, `Close Price:  ${lastClosePrice}; RSI ${latestRSI}; SMA 100 ${sma100}`)
    }

    console.log(toBuy)
}
// check if market is open, if not reset the bought status for stocks

main()