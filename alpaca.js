const Alpaca = require('@alpacahq/alpaca-trade-api')
const helpers = require('./helpers')
const tv = require('./tradingView')
const summaryReport = require('./summaryReport')
const zackCall = require('./zackCall')
const moment = require('moment')

const Papa = require('papaparse');
const fs = require('fs');

const https = require('https');

let stocks = []

const alpaca = new Alpaca({
    // keyId: process.env.ALPACA_KEY_ID_PAPER,
    // secretKey: process.env.ALPACA_SECRET_KEY_PAPER,
    keyId: process.env.ALPACA_KEY_ID_LIVE,
    secretKey: process.env.ALPACA_SECRET_KEY_LIVE,
    // paper: true,
    paper: false,
})

async function getOpenOrders() {
    return await alpaca.getOrders({
        status: 'open'
        // status: 'all'
    })
}

async function getOrders(obj) {
    return await alpaca.getOrders(obj)
}

// get account information
// returns an obj with info such as:  buying_power, portfolio_value, pattern_day_trader, etc
async function getAccount() {
    let results = await alpaca.getAccount()
    return results
}

// NOTE:  Alpaca doesn't have watchlist implemented as part of their api.  So making REST call instead through http
// TODO: finish me
async function getWatchlist() {
    // Can't have multiple watchlists for now so just using Primary Watchlist
    let query = 'https: //paper-api.alpaca.markets/v2/watchlists/f4c73fac-9894-455a-9463-87c35ec3040a'

    let test = await new Promise((resolve, reject) => {
        https.get(query, (res) => {
            let data = '';

            res.on('data', d => {
                data += d
            });
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (err) {
                    reject(err);
                }
            });
        }).on('error', (err) => reject(err));
    })

    console.log(test)
}




//  Gets the last 5 days closing price adds them and divide them by total to get SMA
// NOTE: this was made before implementing Tulind.  Delete if not needed
async function getSMA(tickers, limit) {
    let test = tickers[0]
    let results = await alpaca.getBars('1D',
        tickers, {
            limit: limit
        }).then(res => {
        let sum = 0
        for (let bar of res[test]) {
            // sum += bar.l
            sum += bar.c
        }

        let sma = sum / limit
        sma = sma.toFixed(2)
        return sma
    }).catch(err => {
        console.log('error in get5DSMA')
        console.log(err)
    })

    return results
    // return Promise.all([results])
}

// TODO: check if necessary
// doc:  https://alpaca.markets/docs/api-documentation/api-v2/market-data/bars/
// This function requires, array of symbols, limit on how many bars to return (b/w 1 - 1000), and time frame
// Returns and obj of with and array of the symbol's ohlc
async function getBars(symbols, limit, timeFrame) {

    // time frames:  'minute' | '1Min' | '5Min' | '15Min' | 'day' | '1D',
    // symbol | symbol[], // which ticker symbols to get bars for
    return await alpaca.getBars(
        timeFrame,
        symbols, {
            limit: limit
        }).catch(err => {
        console.log(err)
    })
}

// NOTE: alpaca currently has incomplete market data.  Not using Polygon, going to use alpha vantage due to popularity
async function getBarsTest() {
    // 1590669300
    let dateTime = moment().format()
    console.log(dateTime)

    console.log(moment.unix(1590669300).format())

    // get bars until present day using 5min bars

    // can only get 2 weeks at a time so repeat process by subtracting two weeks to epoch time and run call again

    // prepend the results together

    let result = await alpaca.getBars(
        '5Min',
        ['MSFT'], {
            limit: 1000,
            until: dateTime
        }
    ).catch(err => {
        console.log(err)
    })

    let arr1 = result['MSFT']
    console.log(arr1[0].t)
    console.log(arr1[1].t)
    console.log(arr1[2].t)
    console.log(arr1[3].t)

    // dateTime = moment.unix(arr1[0].t).format()
    // console.log(dateTime)
    // let result2 = await alpaca.getBars(
    //     '5Min',
    //     ['MSFT'], {
    //         limit: 1000,
    //         until: dateTime
    //     }
    // ).catch(err => {
    //     console.log(err)
    // })

    // let arr2 = result2['MSFT']
    // console.log(arr2[0].t)
    // console.log(arr2[arr2.length - 1].t)


    console.log('object')




    // TODO: array.concat()
    return result

}

// Uses getBars and only return the latest closing price
// requires a symbol or array of symbols
async function getLatestPrice(symbols) {
    let result = await alpaca.getBars('minute', symbols, {
        limit: 1
    }).catch(err => err)

    if (result.error) {
        console.error(symbols, 'has encountered an error')
        console.error(result.error)
        return
    }

    let closingPrice = result[symbols][0].c
    return closingPrice
}

// https: //alpaca.markets/docs/api-documentation/how-to/portfolio/
// https://alpaca.markets/docs/api-documentation/api-v2/positions/
// Get the positions of assets in account's portfolio
// returns an array of assets (refer to positions doc for more info)
async function getPositions() {
    return await alpaca.getPositions()

}

async function getPosition(symbol) {
    return await alpaca.getPosition(symbol)

}


// https://alpaca.markets/docs/api-documentation/api-v2/orders/
// Requires a symbol and num of stocks to buy
async function createMarketBuyOrder(symbol, qty) {
    if (!symbol) {
        console.error('Symbol not found!')
        return
    }

    let body = {
        side: "buy",
        symbol: symbol,
        type: "market",
        qty: qty,
        time_in_force: "day",
    }

    // TODO: check if we have enough funds in the account, if true then buy, if not throw exception
    let result = await alpaca.createOrder(body).catch(err => err)

    if (result.error) {
        console.log(symbol)
    }

    console.log(result)
    return result
}

// https://alpaca.markets/docs/api-documentation/api-v2/orders/
// Requires a symbol, buy default num of stocks to buy is 1
async function createMarketBuyStopLimitOrder(symbol, quantity, latestPrice) {
    if (!symbol) {
        console.error('Symbol not found!')
        return
    }
    let stopLimit = 0.1 // Automatically sell if below %10

    // let latestPrice = await getLatestPrice(symbol)
    let stopPrice = latestPrice - (latestPrice * stopLimit)
    stopPrice = stopPrice.toFixed(2)

    let body = {
        side: "buy",
        symbol: symbol,
        type: "market",
        qty: quantity,
        time_in_force: "gtc",
        order_class: "oto",
        stop_loss: {
            "stop_price": parseFloat(stopPrice),
            "limit_price": stopPrice - 0.5
        }
    }

    let account = await alpaca.getAccount()
    if (latestPrice < account.buying_power) {
        return await alpaca.createOrder(body).then(res => {
            console.log(res)
            return res
        }).catch(err => {
            console.log(err)
            return err
        })

    }
}

// like createMarketBuyOrder() but requires an obj with symbol and qty
// helpers.wait() is to prevent too many requests sent at once
// requires:  { symbol: 'MSFT', qty: 1 }
async function createBulkMarketBuyOrder(orders) {
    for (let order of orders) {
        console.log(order)
        await createMarketBuyOrder({
            symbol: order,
            qty: 1
        })

        helpers.wait(1000)
    }
}

// requires obj with symbol and qty
// ie:  { symbol: 'MSFT', qty: 1 }
// TODO: make all of the order functions consistent...
async function createMarketSellOrder(symbol, qty) {
    let body = {
        side: 'sell',
        symbol: symbol,
        type: 'market',
        qty: qty,
        time_in_force: 'day',
    }

    let result = await alpaca.createOrder(body).catch(err => err)

    if (result.error) {
        console.log(symbol)
    }

    console.log(result)
    return result
}

async function createOrder(body) {
    return await alpaca.createOrder(body)
}

async function replaceOrder(orderId, body) {
    return await alpaca.replaceOrder(orderId, body)
}

// TODO: test me
// Requires a symbol and should return if there's an order of that symbol
async function getOrderWithSymbol(symbol) {
    let positions = alpaca.getPositions().catch(err => err)

    if (positions.error) {
        console.error(positions.error)
        return null
    }

    // TODO: can prob use filter
    let position = positions.map(stock => {
        stock.some(el => el.symbol === symbol)
    })

    return position
}

async function getOrder(orderId) {
    return await alpaca.getOrder(orderId)
}

// https: //alpaca.markets/docs/trading-on-alpaca/orders/
// NOTE: Advanced form of ordering, like bracket orders, order replacement is not supported yet
// TODO: create and test function
// requires order_class param, from what I read this is like submitting a stop loss order
async function createOTOStopLossOrder() {
    // reference
    let order = {
        "side": "buy",
        "symbol": "SPY",
        "type": "market",
        "qty": "100",
        "time_in_force": "gtc",
        "order_class": "oto",
        "stop_loss": {
            "stop_price": "299",
            "limit_price": "298.5"
        }
    }

    let result = await alpaca.createOrder(order).then(res => {
        console.log(res)
        return res
    })

    return result
}


// TODO: finish function
// NOTE:  uses alpaca's getPortfolio(), need to create trading algo here
// Get's status of account's portfolio then buy/sell based on the status of the asset
async function evaluatePortfolio() {
    // Sell the stock if lost -10% in value
    let sellLimit = -10

    let stocks = await getPositions()
    let output = []



    for (let stock of stocks) {
        let totalPLPercentage = stock.unrealized_plpc * 100
        totalPLPercentage = totalPLPercentage.toFixed(2)

        // TODO: use trading view to evaluate stock rating
        // if rating is neutral or lower, sell
        // NOTE: this can take array of stocks but we'll evaluate each stock in the loop
        // let taResult = await tv.getTechnicalAnalaysisInfo([`${stock.exchange}:${stock.symbol}`], '1D') 

        // Format to AMEX
        // NOTE:  we have a helper function for this now
        if (stock.exchange == 'ARCA' || stock.exchange == 'BATS' || stock.exchange == 'NYSEARCA') {
            stock.exchange = 'AMEX'
        }
        // console.log('testing:  ' + stock.symbol)
        // console.log('exchange after:  ' + stock.exchange)

        // TODO: it might be better and more efficient to have all the stocks to be formatted and pushed in an array and have 1 single call
        // instead of running the call multiple times for each stock.  Then sort the array later using helpers.sort()
        let taResult = await tv.getTechnicalAnalaysisInfo([`${stock.exchange}:${stock.symbol}`], '1') // gets 1min TA
        let ta1DResult = await tv.getTechnicalAnalaysisInfo([`${stock.exchange}:${stock.symbol}`], '1D') // gets 1Day TA
        let zackResult = await zackCall.getData(stock.symbol)
        let taText = taResult[0].technicalAnalysis1.summary1.status
        let ta1DText = ta1DResult[0].technicalAnalysis1D.summary1D.status
        let zacksRank = zackResult.zacksRank
        // console.log(stock.symbol + ' taResult: ', taText)
        // console.log(stock.symbol + ' ta1DResult: ', ta1DText)

        // if zacks rating fall below 2, sell

        // if total loss is past -10%, sell
        if (totalPLPercentage < sellLimit) {
            console.log('%ccut your loss', 'color:red')
            console.log(stock.symbol, totalPLPercentage)

            // TEMP DON'T SELL ANYTHING
            createMarketSellOrder({
                symbol: stock.symbol,
                qty: stock.qty
            })
        } else {
            console.log(stock.symbol, 'totalPLPercentage:  ' + totalPLPercentage)
        }

        // TODO: need to check from a watchlist to evaluate stocks not in portfolio
        if (taText == 'Strong Buy') {
            // TODO: buy 1 stock   
            createMarketBuyOrder({
                symbol: stock.symbol,
                qty: 1
            })
        } else if (taText == 'Strong Sell') {
            // Sell all stocks
            createMarketSellOrder({
                symbol: stock.symbol,
                qty: stock.qty
            })
        }

        let test = stock.change_today * 100
        test = test.toFixed(2)

        let obj = {
            symbol: stock.symbol,
            formattedExchange: stock.exchange,
            qty: stock.qty,
            totalPLPercentChange: totalPLPercentage + '%',
            stockPrice: stock.market_value,
            changeToday: test + '%',
            ta1MinuteText: taText,
            ta1DMinuteText: ta1DText,
            zacksRank: zacksRank,
        }

        output.push(obj)
    }

    console.table(output)
    // TODO: get current date and time and use for filename
    summaryReport.exportToCSV(output, '5-12-20-EXPERIMENT')

}

// Check if the stock market is open or not and return a boolean value
async function getMarketStatus() {
    return await alpaca.getClock().then(res => res.is_open)
}

// https://alpaca.markets/docs/api-documentation/api-v2/assets/
// Returns a list of active assets
async function getAssets() {
    return await alpaca.getAssets({
        status: 'active',
        tradable: true
    }).catch(err => err)
}

// This is to set stocks info to later make TA calls
async function initStocks() {

    // NOTE: csv currently need stock symbols sorted alphabetically
    let readCompleteInfos = fs.readFileSync("./test.csv", 'utf8');
    let completeInfos = Papa.parse(readCompleteInfos, {
        header: true
    });

    let counter = 1


    for (let stock of completeInfos.data) {
        if (stock['name']) {

            stock['exchange'] = await formatExchange(stock['exchange'])

            let zackRank = await zackCall.getData(stock['symbol'])
            let rating = await tv.getTechnicalAnalaysisInfo([`${stock['exchange']}:${stock['symbol']}`], '1') // gets 1min TA
            let alpacaAssetId = await alpaca.getAsset(stock['symbol'])

            stocks.push({
                alpacaId: alpacaAssetId,
                orderId: null, // For buying/selling stocks
                symbol: stock['symbol'],
                name: stock['name'],
                exchange: stock['exchange'],
                zackRank: zackRank['zacksRank'],
                rating: rating[0].technicalAnalysis1.summary1.status
            })


            console.log(`${counter}/${completeInfos.data.length - 1}`)
            counter++
        }

    }

    console.log('done')
    // need ticker, name, zack rank
}



// Grab the the array objs from the array
// Need to make stocks var already set

// FIXME: won't work if Pattern Day Trading protection is enabled
async function evaluateWatchlist() {
    // TODO: plan to have this like evaluatePortfolio() but instead of evaluating to buy and sell stocks in portfolio,
    // will plan to evaluate stocks given from an array or csv file

    let isOpen = await getMarketStatus()
    if (!isOpen) {
        console.log('Market is closed')
        return
    }

    let input = []
    for (let stock of stocks) {
        input.push(`${stock.exchange}:${stock.symbol}`)
    }

    let taResult = await tv.getTechnicalAnalaysisInfo(input, '1') // gets 1min TA
    taResult.sort(helpers.sortStocks)

    for (let i = 0; i < stocks.length; i++) {

        // Conditional Sell
        // Checking the Summary Rating with this property
        let summaryRating = taResult[i].d[1]

        // Continue selling only if there are no pending orders and TA says Neutral or lower
        // if inside portfolio, rating is low, and no pending order, sell
        let stockPosition = await alpaca.getPosition(stocks[i].symbol).catch(err => {
            console.log(err.error)
            return err.error
        })

        // If there's and orderId, check if it's still pending
        if (stocks[i].orderId) {
            let result = await alpaca.getOrder(stocks[i].orderId)
            console.log(result)
            if (result.status == 'filled') {
                stocks[i].orderId = null
            }
        }

        if (!stockPosition.code && summaryRating && summaryRating < -0.00000001 && !stocks[i].orderId) {
            console.log('Selling stock! ', stocks[i].symbol)
            // let stocksInPortfolio = await alpaca.getPosition(stocks[i].symbol)
            let result = await createMarketSellOrder({
                symbol: stocks[i].symbol,
                qty: stockPosition.qty
            }).catch(err => {
                console.log(err)
            })

            stocks[i].orderId = result.id
        }

        // Conditional Buy
        // Only Buy if TA considers it a Strong Buy
        if (summaryRating && summaryRating > 0.5) {
            console.log('Buying stock! ', stocks[i].symbol)

            // Get the latest price
            let latestPrice = await getLatestPrice(stocks[i].symbol)

            let account = await alpaca.getAccount()

            if (latestPrice < account.buying_power) {
                await createMarketBuyStopLimitOrder({
                    symbol: stocks[i].symbol,
                    qty: 1
                }).catch(err => {
                    console.log(err)
                })
            } else {
                console.log('INSUFFICIENT BUYING POWER')
            }

        }


    }



}

module.exports = {
    getBars,
    getPositions,
    getPosition,
    // closeAllPositions,
    // getAsset,
    getAssets,
    createBulkMarketBuyOrder,
    createMarketBuyOrder,
    createMarketBuyStopLimitOrder,
    createMarketSellOrder,
    evaluatePortfolio,
    get5DSMA: getSMA,
    evaluateWatchlist,
    initStocks,
    getMarketStatus,
    getOpenOrders,
    getOrderWithSymbol,
    getOrder,
    getOrders,
    getAccount,
    createOrder,
    replaceOrder
}

// getBarsTest()
// getOrders()
// getWatchlist()