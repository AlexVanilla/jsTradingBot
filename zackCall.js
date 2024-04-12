const https = require('https');

const fs = require('fs');
const Papa = require('papaparse');
const helpers = require('./helpers')

require('dotenv').config()
// TODO: maybe make a function that takes array of stock symbols then run getData() in a loop

/*
Description: Returns stock info from Zacks
@params: String ticker - ie:  KGC
getData("KGC")
*/
// Run a GET call using the stock symbol
// Requires just a string of the stock symbol
async function getData(stockSymbol) {
    const ticker = stockSymbol.toUpperCase()

    let result = await getCall(ticker)
        .then(format(ticker))
        .catch(err => {
            console.error(err)
        })

    console.log(result)
    return result
}

function getCall(ticker) {
    let query = process.env.ZACK_RANK_URL + ticker.toUpperCase();

    return new Promise((resolve, reject) => {
        https.get(query, (res) => {
            let data = '';

            res.on('data', d => {
                data += d
            });
            res.on('end', () => {
                try {
                    // FIXME: check APXTU is working.  JSON position at 0 is throwing error
                    resolve(JSON.parse(data));
                } catch (err) {
                    reject(err);
                }
            });
        }).on('error', (err) => reject(err));
    })
}

const format = symbol => data => {
    const tmp = data[symbol];

    if (tmp.error) {
        console.error(`${symbol} wasn't found for zack ranking`)
        return {
            symbol: symbol,
            name: null,
            zacksRankText: null,
            zacksRank: null,
            sourceSungardExchange: null,
            updatedAt: null
        }
    }

    return {
        symbol: tmp.ticker,
        name: tmp.name,
        zacksRankText: tmp.zacks_rank_text,
        zacksRank: tmp.zacks_rank,
        sourceSungardExchange: tmp.source.sungard.exchange,
        updatedAt: new Date(tmp.updated).toISOString()
    }
}

// requires zack rank number
// requires array of obj with at least symbol and zacksRank number
function filterStocks(stocks, zackRank) {
    let recommendedStocks = []

    for (let stock of stocks) {
        // return stocks that's higher than rank specified in params
        // FIXME: can't read zack rank of undefined
        // if(stock.zackRank == null){
        if(stock.zacksRank == null){
            console.log("object")
        } else {
        console.log(stock, stock.zacksRank)
        }

        if (stock.zacksRank != '' && stock.zacksRank != null && stock.zacksRank <= zackRank) {
            recommendedStocks.push(stock)
        }
    }

    return recommendedStocks
}

// takes a csv file (needs to at least have rows of stock symbols with 'ticker' as the header)
// gets the zack rank of each one that filters and keeps only the ones with rank 3 or higher
// exports it to another csv that we can later use for evaluating their TA
// planning to have this as proper function 
async function testing() {
    let test = helpers.parseCSV('./zacks-ranking-11-1.csv')
    // let symbols = test.data.map(symbol => symbol.ticker)
    let symbols = test.data.map(symbol => symbol.symbol)
    console.log(symbols)

    let stocks = []
    for (symbol of symbols) {
        // FIXME: handle SCE/PB

        let result = await getData(symbol)

        console.log(symbol)
        console.log(result)
        if(!result.zacksRank){
            console.log("object")
        } else {
            stocks.push(result)
        }
    }
    let recommendedStocks = filterStocks(stocks, 5)
    helpers.exportToCSV(recommendedStocks, 'zacks-ranking-12-1')
};

// TODO: maybe on Wed, middle of market week, re-evauluate watched stocks?
// go to tradingview market and go to sector
// take top 5 performing sectors (make a list of it)
// go to the screener and filter with the sectors
// make sure relative income is greater than 1
// download as csv and change the file to only have the ticker symbol
// change 'Ticker' head to 'symbol'
// use zack call to rank

// NOTE: Uncomment me whenever you want to run the tradingview > zack call function
// testing()

module.exports = {
    getData,
    filterStocks
}