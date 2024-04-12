'use strict'

const Papa = require('papaparse');
const fs = require('fs');
const api = require('./zackCall')
const summary = require('./summaryReport')
const alpaca = require('./alpaca')
const tv = require('./tradingView')
const helpers = require('./helpers')
const tulind = require('tulind');
const order = require('@alpacahq/alpaca-trade-api/lib/resources/order');

require('dotenv').config()

const main = async () => {
    const buyLimit = 1000 // Limit on how much stock to buy each trade

    console.log('started')
    console.log('Is market open?', await alpaca.getMarketStatus())

    let positionsInitial = await alpaca.getPositions().catch(err => {
        console.log('ERROR in getPositions()')
        console.log(err)
    })

    // Init the stocks to prevent too many requests being sent
    let test = helpers.parseCSV('./zacks-ranking-12-1.csv')
    let csvSymbols = test.data.map(symbol => symbol.symbol)

    let positionSymbols = positionsInitial.map(position => position.symbol)

    // Combine both CSV and current position arrays and have those as array to run bar data
    // Use Set to remove duplicate stock symbols
    // let symbols = [...new Set([...csvSymbols, ...positionSymbols])]

    let symbols = [...new Set([...csvSymbols])]

    // Remove stocks in position from the symbols array to prevent the stop loss trigger and same buy in one day
    symbols = symbols.filter(e => !positionSymbols.includes(e))

    // console.log(symbols)

    // Evaluate stock positions in beginning of the day
    for (let position of positionsInitial) {
        // Renaming the current price to match naming convention
        const {
            current_price: currentPrice,
            qty,
            symbol
        } = position

        // sell any positions that has exceeded 10% loss
        let totalPLPercentage = position.unrealized_plpc * 100
        totalPLPercentage = totalPLPercentage.toFixed(2)

        if (parseFloat(totalPLPercentage) < -10) {
            console.log(`SELLING ${symbol}:  totalPL:  ${totalPLPercentage}`)

            let body = {
                side: 'sell',
                symbol: symbol,
                type: 'market',
                qty: qty,
                time_in_force: 'gtc',
            }

            let sellResult = await alpaca.createOrder(body).then(async result => {
                helpers.logTransaction(result)
            }).catch(async err => {
                console.log(`Initial create order failed.  Try to do replace order`)

                // try to update open order
                let latestOpenOrderId = err.error.related_orders[0]
                let latestOrder = await alpaca.getOrder(latestOpenOrderId)
                console.log(latestOrder)

                let replaceResult = await alpaca.replaceOrder(latestOpenOrderId, body).catch(err => {
                    console.log(`ERROR IN REPLACE RESULT:  ${err}`)
                })

                console.log("replace order was success")
                helpers.logTransaction(replaceResult)
            })

        } else {
            // If not lost 10%, each day create a stop loss order to manage risk
            let stopLimit = 0.10 // Automatically sell if below %10 (sell algo will have threshold of 2%)

            let stopPrice = currentPrice - (currentPrice * stopLimit)
            stopPrice = stopPrice.toFixed(2)

            let body = {
                "symbol": symbol,
                "qty": qty,
                "side": "sell",
                "time_in_force": "gtc",
                "type": "stop",
                "stop_price": stopPrice
            }

            // Since creating stop loss in the beginning of each day, need to find the order and replace it with an updated stop order
            let result = await alpaca.createOrder(body).catch(async err => {
                console.log(`Initial create order failed.  Try to do replace order`)

                // try to update open order
                // TODO: get open order with this id.  compare stop prices. if current stopPrice is higher than order's stop price, replace it
                let latestOpenOrderId = err.error.related_orders[0]
                let latestOrder = await alpaca.getOrder(latestOpenOrderId)
                console.log(latestOrder)


                // get current order and it's stop price

                // need to format the latest order stop price
                console.log(`latestOrder.stop_price ${latestOrder.stop_price}`)
                let orderStopPrice = parseFloat(latestOrder.stop_price)
                orderStopPrice = orderStopPrice.toFixed(2)

                // if stop price is greater than the stop price of current order, replace it
                if (orderStopPrice < stopPrice) {
                    console.log(`orderStopPrice:  ${orderStopPrice} current defined stopPrice:  ${stopPrice}`)

                    let body = {
                        "symbol": symbol,
                        "qty": qty,
                        "side": "sell",
                        "time_in_force": "gtc",
                        "type": "stop",
                        "stop_price": stopPrice
                    }

                    let replaceResult = await alpaca.replaceOrder(latestOpenOrderId, body).catch(err => {
                        console.log(`ERROR IN REPLACE RESULT:  ${err}`)
                    })

                    console.log("replace order was success")
                    console.log(replaceResult)
                    helpers.logTransaction(replaceResult)
                } else {
                    console.log(`current stopPrice not higher than stop price in the open order`)
                    console.log(`latestOrder stop_Price:  ${latestOrder.stop_price} current defined stopPrice:  ${stopPrice}`)
                }
            })


        }
    }

    let algos = async () => {
        // If market is false, skip the algos
        // console.log('Is market open?', await alpaca.getMarketStatus());
        if (!await alpaca.getMarketStatus()) {
            console.log("testing market check")
            return
        }

        // TODO: get overall market status here.  NASDAW, DOW, S&P 500
        

        console.log("at buy algo!!!")
        // Note 5Min is also the same timeframe robinhood updates their price actions
        // TODO: can only run getBars 200 symbols at a time, cap at 200 symbols or integrate Polygon stream (you lazy bum)
        console.log(`at buy get bars`)
        let toBuyBarsData = await alpaca.getBars(symbols, 1000, '5Min').catch(err => {
            console.log(`error happened in buy get bars`)
            console.log(err)
            console.trace(err)
        })

        let barObj = {}
        for (const symbol in toBuyBarsData) {
            let bars = toBuyBarsData[symbol]
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
        }

        // filter out stocks if it's penny stock or if prices aren't found
        let toFilter = []
        for (const symbol in barObj) {
            let closePrices = barObj[symbol].close

            // If closePrices are not found, remove the symbol from list of symbols to evalatuate
            if (closePrices.length == 0 || !closePrices) {
                console.log(`${symbol} close prices not found`)
                toFilter.push(symbol)
            }

            // Remove penny stocks
            let lastClosePrice = closePrices[closePrices.length - 1]
            if (lastClosePrice < 5) {
                console.log(`${symbol}'s close price is too low.  Removing from list.  Last Close price:  ${lastClosePrice}`)
                toFilter.push(symbol)
            }
        }

        for (const symbol of toFilter) {
            delete barObj[symbol]
        }

        // ALGORITHM ***********************
        // Iterate through barObj
        // Take RSI, if below 30 and is below 100 day SMA, and not in our portfolio, buy stock
        // If RSI is over 70 and in our portfolio, sell it

        let toBuy = []
        for (const symbol in barObj) {
            // let closePrices = barObj[symbol].close
            // let highPrices = barObj[symbol].high
            // let lowPrices = barObj[symbol].low
            // let volume = barObj[symbol].volume
            const {
                close: closePrices,
                high: highPrices,
                low: lowPrices,
                volume
            } = barObj[symbol];

            let lastClosePrice = closePrices[closePrices.length - 1]

            // TODO:  check if using ATR is best way to form stop loss orders
            // // Get the latest ATR and create a stop loss price to later create
            // let atrTrailingStop
            // tulind.indicators.atr.indicator([highPrices, lowPrices, closePrices], [14], async function (err, results) {
            //     atrTrailingStop = results[0][results[0].length - 1]
            //     atrTrailingStop = atrTrailingStop * 2
            //     atrTrailingStop = lastClosePrice - atrTrailingStop
            // })


            let latestRSI
            tulind.indicators.rsi.indicator([closePrices], [14], async function (err, results) {
                latestRSI = results[0][results[0].length - 1]
            })

            let latestMFI // Like RSI but takes into account volume
            tulind.indicators.mfi.indicator([highPrices, lowPrices, closePrices, volume], [14], async function (err, results) {
                latestMFI = results[0][results[0].length - 1]
            })

            let sma20Day // Choosing 20-Day SMA to just mimic bollinger band calculation
            tulind.indicators.sma.indicator([closePrices], [100], async function (err, results) {
                sma20Day = results[0][results[0].length - 1]
            })

            // console.log(`${symbol}: Close Price: ${lastClosePrice}; RSI ${latestRSI}; MFI ${latestMFI}; SMA ${sma20Day}`)

            // BUYING ALGO
            if (latestRSI < 30 && latestMFI < 20 && lastClosePrice < sma20Day) {
                // buyLimit = 1000 // Have each trade enter $1000 at a time
                toBuy.push(symbol)

                // check if stock is in portfolio
                let positions = await alpaca.getPositions().catch(err => {
                    console.trace(err)
                })
                let filtered = positions.filter(el => el.symbol === symbol)

                // check if there's an open order already
                let orders = await alpaca.getOpenOrders()
                let filteredOrders = orders.filter(el => el.symbol === symbol)

                // Check if have enough buy power
                let account = await alpaca.getAccount()
                const {
                    buying_power: buyingPower
                } = account

                // If not found in positions, open orders, and have enough buy power (have each trade constrained by buyLimit at a time), buy the stock
                if (!filtered[0] && !filteredOrders[0] && lastClosePrice < buyingPower && buyingPower > buyLimit) {

                    let quantity = Math.floor(buyLimit / lastClosePrice)

                    let results
                    if (quantity != 0) {
                        console.log(`${symbol} - BUYING STOCK`)
                        results = await alpaca.createMarketBuyOrder(symbol, quantity).catch(err => {
                            console.log(`problem in create buy order`)
                            console.log(err)
                        })
                    }

                    // TODO: might be better to do limit order in case price spikes up (prevent slippage)
                    // await alpaca.createMarketBuyStopLimitOrder(symbol, quantity, lastClosePrice)
                    /*
                    let stopPrice = currentPrice - (currentPrice * stopLimit)
                    stopPrice = stopPrice.toFixed(2)

                    let body = {
                        "symbol": symbol,
                        "qty": qty,
                        "side": "sell",
                        "time_in_force": "day", // have this order open until end of market day
                        "type": "stop",
                        "stop_price": stopPrice
                    }

                    console.log('about to order')
                    let result = await alpaca.createOrder(body).catch(async err => {
                                    console.log(`Initial create order failed.  Try to do replace order`)
                    }


                    */


                    if (results) {
                        helpers.logTransaction(results)

                    }
                }
            }
        }






        console.log("at SELL algo!!!")

        // TODO: evaluate currentPositions here
        let positions = await alpaca.getPositions().catch(err => {
            console.log('ERROR in getPositions()')
            console.log(err)
        })

        // NOTE: we're using positionSymbols because we only want to evaluate symbols from yesterday
        // Note 5Min is also the same timeframe robinhood updates their price actions
        // TODO: can only run getBars 200 symbols at a time, cap at 200 symbols or integrate Polygon stream (you lazy bum)

        let positionSymbols = positions.map(position => position.symbol)

        console.log(`at sell getBars`)
        let toSellBarsData = await alpaca.getBars(positionSymbols, 1000, '5Min').catch(err => {
            console.log(`error happened in sell get bars`)
            console.log(err)
            console.trace(err)
        })

        let sellBarObj = {}
        for (const symbol in toSellBarsData) {
            let bars = toSellBarsData[symbol]
            sellBarObj[symbol] = {
                open: [],
                high: [],
                low: [],
                close: [],
                volume: [],
                epochTime: []
            }
            for (let i = 0; i < bars.length; i++) {
                sellBarObj[symbol].open.push(bars[i].o)
                sellBarObj[symbol].high.push(bars[i].h)
                sellBarObj[symbol].low.push(bars[i].l)
                sellBarObj[symbol].close.push(bars[i].c)
                sellBarObj[symbol].volume.push(bars[i].v)
                sellBarObj[symbol].epochTime.push(bars[i].t)
            }
        }

        console.log("AT SELL ALGO")
        for (const symbol in sellBarObj) {

            let closePrices = sellBarObj[symbol].close
            let highPrices = sellBarObj[symbol].high
            let lowPrices = sellBarObj[symbol].low
            let volume = sellBarObj[symbol].volume

            let lastClosePrice = closePrices[closePrices.length - 1]

            let latestRSI
            tulind.indicators.rsi.indicator([closePrices], [14], async function (err, results) {
                latestRSI = results[0][results[0].length - 1]
            })

            // console.log(`${symbol}: Close Price: ${lastClosePrice}; RSI ${latestRSI};`)

            // SELLING ALGO
            // If RSI above 70, check if in portfolio, if so, sell all stocks
            if (latestRSI >= 70) {
                console.log(`${symbol} RSI IS HIGH: ${latestRSI}`)

                let stopLimit = 0.1 // Automatically sell if below 10%

                console.log(`${symbol} - SELLING STOCK`)

                let position = await alpaca.getPosition(symbol)

                // Renaming the current price to match naming convention
                const {
                    current_price: currentPrice,
                    qty
                } = position

                console.log(`currentPrice:  ${currentPrice};    qty: ${qty}`)

                // use current_price instead for defining stop loss
                // let stopPrice = lastClosePrice - (lastClosePrice * stopLimit)
                let stopPrice = currentPrice - (currentPrice * stopLimit)
                stopPrice = stopPrice.toFixed(2)

                let body = {
                    "symbol": symbol,
                    "qty": qty,
                    "side": "sell",
                    "time_in_force": "gtc",
                    "type": "stop",
                    "stop_price": stopPrice
                }

                // Since creating stop loss in the beginning of each day, need to find the order and replace it with an updated stop order

                // get related_orders[0] the id of the current order


                console.log('about to order')
                let result = await alpaca.createOrder(body).catch(async err => {
                    console.log(`Initial create order failed.  Try to do replace order`)

                    // try to update open order
                    // TODO: get open order with this id.  compare stop prices. if current stopPrice is higher than order's stop price, replace it
                    let latestOpenOrderId = err.error.related_orders[0]
                    let latestOrder = await alpaca.getOrder(latestOpenOrderId)
                    console.log(latestOrder)


                    // get current order and it's stop price

                    // need to format the latest order stop price
                    console.log(`latestOrder.stop_price ${latestOrder.stop_price}`)
                    let orderStopPrice = parseFloat(latestOrder.stop_price)
                    orderStopPrice = orderStopPrice.toFixed(2)

                    // if stop price is greater than the stop price of current order, replace it
                    if (orderStopPrice < stopPrice) {
                        console.log(`orderStopPrice:  ${orderStopPrice} current defined stopPrice:  ${stopPrice}`)

                        let replaceResult = await alpaca.replaceOrder(latestOpenOrderId, body).catch(err => {
                            console.log(`ERROR IN REPLACE RESULT:  ${err}`)
                        })

                        console.log("replace order was success")
                        console.log(replaceResult)

                        // After selling need to log the filled transactions in an excel with the buy orders
                        helpers.logTransaction(replaceResult)
                    } else {
                        console.log(`current stopPrice not higher than stop price in the open order`)
                        console.log(`latestOrder stop_Price:  ${latestOrder.stop_price} current defined stopPrice:  ${stopPrice}`)
                    }
                })


                if (result) {
                    console.log("first create order was success")
                    console.log(result)
                    helpers.logTransaction(result)
                }

            }
        }

        // Console log to buy stocks
        console.log('--------------- TO BUY ---------------')
        console.log(toBuy)

    }

    // setInterval(algos, (5 * 1000) * 60)

    let myVar = setInterval(algos, 1000)
    clearInterval(myVar)

}
main()