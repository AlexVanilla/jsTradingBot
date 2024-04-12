'use strict';

const https = require('https')
const helpers = require('./helpers.js')

// 

/*
Description: Returns Technical Analysis report from Trading View
@params: String[] tickers - ie:  ["NYSE:KGC"]
getTradingViewTA1Day(["NASDAQ:MSFT"], "1M")
*/


async function getTechnicalAnalaysisInfo(tickers, timePeriod) {
    return await getTAInfo(tickers, timePeriod)
        .then(res => {
            return res.data
        })
        .catch(err => {
            console.error(err)
        })
}


// TODO: break this into smaller functions
async function getTAInfo(tickers, timePeriod) {
    // FIXME: ARCA might need to be 'NYSE ARCA' for trading view
    let columns = null;

    // TODO: might need to reformat this
    if (timePeriod == null || timePeriod == '' || timePeriod == '1D') {
        timePeriod = '1D' // Make sure timePeriod is defined to have as property key later
        columns = ["Recommend.Other", "Recommend.All", "Recommend.MA"]
    } else if (timePeriod == "1W") {
        columns = ["Recommend.Other|1W", "Recommend.All|1W", "Recommend.MA|1W"]
    } else if (timePeriod == "1M") {
        columns = ["Recommend.Other|1M", "Recommend.All|1M", "Recommend.MA|1M"]
    } else if (timePeriod == "1") {
        columns = ["Recommend.Other|1", "Recommend.All|1", "Recommend.MA|1"]
    }

    // NOTE:  3 kinds of exchange usually used: NYSE ARCA (considered AMEX), NASDAQ, NYSE
    let query = {
        symbols: {
            tickers: tickers
        },
        columns: columns
    }

    let data = JSON.stringify(query)

    const options = {
        hostname: 'scanner.tradingview.com',
        path: '/america/scan',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': data.length
        }
    }

    // POST Call
    return new Promise((resolve, reject) => {
        let req = https.request(options, (res) => {
            let data = ''
            res.on('data', d => data += d)
            res.on('end', () => {
                let output = JSON.parse(data)
                if (output.totalCount == 0) {
                    reject("No results were found for Technical Analysis")
                } else {
                    let test = format(output.data, timePeriod)
                    console.log(test)
                    resolve(output)
                }
            })
        })

        req.write(data)
        req.end()
    }).catch(err => err)
}

async function format(stocks, timePeriod) {
    for (let data of stocks) {
        let status = []
        let calculations

        for (calculations of data.d) {
            // NOTE the data from TA is in an aray in this order: ['oscillator', 'summary', 'moving average']
            if (calculations <= -0.5) {
                calculations = "Strong Sell"
            } else if (calculations > -0.59999999 && calculations <= -0.00000001) {
                calculations = "Sell"
            } else if (calculations == 0 || calculations == null) {
                calculations = "Neutral"
            } else if (calculations > 0 && calculations <= 0.5) {
                calculations = "Buy"
            } else if (calculations > 0.5) {
                calculations = "Strong Buy"
            }

            status.push(calculations)
        }

        data['technicalAnalysis' + timePeriod] = {}

        data['technicalAnalysis' + timePeriod]['oscillator' + timePeriod] = {}
        data['technicalAnalysis' + timePeriod]['summary' + timePeriod] = {}
        data['technicalAnalysis' + timePeriod]['movingAverages' + timePeriod] = {}

        data['technicalAnalysis' + timePeriod]['oscillator' + timePeriod]['status'] = status[0]
        data['technicalAnalysis' + timePeriod]['oscillator' + timePeriod]['value'] = data.d[0]

        data['technicalAnalysis' + timePeriod]['summary' + timePeriod]['status'] = status[1]
        data['technicalAnalysis' + timePeriod]['summary' + timePeriod]['value'] = data.d[1]

        data['technicalAnalysis' + timePeriod]['movingAverages' + timePeriod]['status'] = status[2]
        data['technicalAnalysis' + timePeriod]['movingAverages' + timePeriod]['value'] = data.d[2]

        // Adding the stock name to our results
        let temp = data.s.split(":")
        data['exchange'] = temp[0]
        data['symbol'] = temp[1]
    }

    // sort the array of stocks before returning
    if (!stocks.sort(helpers.sortStocks)) {
        return null
    } else {
        return stocks.sort(helpers.sortStocks)
    }
}

// Formats and array of objects with symbol and exchange
// should be parsed and have an array of objects:  { symbol: 'MSFT', exhange: 'NASDAQ' }
function getTradingViewStocks(stockArray) {
    let stonks = []

    for (const stock of stockArray) {
        // Replace NYSE ARCA and BATS with AMEX for TradingView calls, else keep original value
        let exchange = stock.Exchange == 'NYSE ARCA' || stock.Exchange == 'BATS' ? 'AMEX' : stock.Exchange

        if (stock.Ticker != "") {
            stonks.push({
                symbol: stock.Ticker,
                exchange: exchange
            });
        }
    }

    return stonks
}
// getTechnicalAnalaysisInfo(["NYSE:BBW"], "1M")

module.exports = {
    getTechnicalAnalaysisInfo: getTechnicalAnalaysisInfo,
    getTradingViewStocks: getTradingViewStocks
}