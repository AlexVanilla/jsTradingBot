// TODO:  clean up on what needs to be on index
// really want to hurry up and implement tulind


    // Run this weekly with the next stock screeners
    let results = await alpaca.getAssets()
    let exchangeTickers = []
    for (let stock of results) {
        stock.exchange = helpers.formatToAMEX(stock.exchange)
        exchangeTickers.push(`${stock.exchange}:${stock.symbol}`)
    }


    // let day1TA = await tv.getTechnicalAnalaysisInfo(exchangeTickers, "1D").then(res => {
    //     // Filter out stocks only with Strong Buy summary rating
    //     return res.filter(stock => {
    //         return stock.technicalAnalysis1D.summary1D.status == 'Strong Buy'
    //     })
    // }).catch(err => {
    //     console.log(err)
    // })

    // // resuse the array and insert the exchangeTickers with 1D Strong Buy
    // exchangeTickers.length = 0

    // for (let stock of day1TA) {
    //     exchangeTickers.push(stock.s)
    // }

    // let strongBuys = await tv.getTechnicalAnalaysisInfo(exchangeTickers, "1W").then(res => {
    //     // Filter out stocks only with Strong Buy summary rating
    //     return res.filter(stock => {
    //         return stock.technicalAnalysis1W.summary1W.status == 'Strong Buy'
    //     })
    // }).catch(err => {
    //     console.log(err)
    // })

    // TODO: run this weekly 
    // for (let stock of strongBuys) {
    //     // await alpaca.createMarketBuyStopLimitOrder(stock.symbol)
    //     await alpaca.createMarketBuyOrder(stock.symbol, 10)
    //     helpers.wait(500)
    // }


    // // Enable this once have stocks in portfolio
    // let strongBuys = await alpaca.getPositions()
    // for(let stock of strongBuys){
    //     stock.exchange = helpers.formatToAMEX(stock.exchange)
    // }



    let toBuy = []
    let i = 1

    let stocks = []
    for (let stock of results) {
        // let day20SMA = await alpaca.get5DSMA([stock.symbol], 20)
        // let day50SMA = await alpaca.get5DSMA([stock.symbol], 50)

        // console.log(stock.symbol, day20SMA, day50SMA)

        // if (day20SMA < day50SMA) {
        // toBuy.push(stock)
        // }
        stocks.push(stock.symbol)

        console.log(i)
        i++
    }

    // TODO: need to split by 200 legnth since that's the limit
    stocks.length = 200
    let results = await alpaca.getBars(stocks, 50)

    for (const symbol in results) {
        let bars = results[symbol]
        bars = bars.reverse()

        console.log(`${symbol}: ${bars}`)

        // Only calculate bars with 50 days
        let sum = 0

        if (bars.length == 50) {
            console.log(bars)

            // Get 20Day SMA
            for (let i = 0; i < 20; i++) {
                sum += bars[i].c
            }

            let sma20 = sum / 20
            sma20 = sma20.toFixed(2)

            for (let i = 20; i < 50; i++) {
                sum += bars[i].c
            }

            let sma50 = sum / 50
            sma50 = sma50.toFixed(2)

            if (sma20 < sma50) {
                toBuy.push(symbol)
            }

        }
    }

    console.log(toBuy)


    console.log(result)
    // // NOTE: need to have {symbol, exchange} to use this to get summary data
    // let stockSymbols = []
    // for (let stock of strongBuys) {
    //     stockSymbols.push({
    //         symbol: stock.symbol,
    //         exchange: stock.exchange
    //     })
    // }
    // let summaryInfo = await summary.getBriefStockStatus(stockSymbols)

    // let filename = new Date() + ' - Strong Buys Experiment'
    // helpers.exportToCSV(summaryInfo, filename)



    // // TODO: RUN THIS PART TO BUY STOCKS WEEKLY
    // // Take a file (ideally ones with zack rank 1) and create bulk market buy order
    // let readCompleteInfos = fs.readFileSync("./zack1RankStocks.csv", 'utf8');
    // let completeInfos = Papa.parse(readCompleteInfos, {
    //     header: true
    // });

    // let test = []
    // for(let s of completeInfos.data){
    //     console.log(s.name)
    //     test.push(s['﻿symbol'])
    // }

    // // array of symbols ['MSFT', 'AAPLE', 'AMZN', ...]
    // await alpaca.createBulkMarketBuyOrder(test)

