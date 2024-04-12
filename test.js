const https = require('https');
const tulind = require('tulind');
const alpaca = require('./alpaca')
const helpers = require('./helpers')

const main = async () => {

    // Need to rework risk management system

    // beginning of each day, market sell all that has totalPL loss of 5%


    // evaluate stocks to buy and sell seperately (we don't want a scenario where we sell the stock and buy it right back)


    // get list of buy stocks from watch list and remove stocks in currentPosition


    // get list of stocks to sell from getCurrentPosition



    // let toSellBarsData = await alpaca.getBars(['MSFT', 'AAPL', 'AMZN'], 1000, '5Min')
    let toSellBarsData = await alpaca.getBars(['MSFT'], 1000, '5Min')

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

        sellBarObj[symbol] 
        for (let i = 0; i < bars.length; i++) {
            sellBarObj[symbol].open.push(bars[i].o)
            sellBarObj[symbol].high.push(bars[i].h)
            sellBarObj[symbol].low.push(bars[i].l)
            sellBarObj[symbol].close.push(bars[i].c)
            sellBarObj[symbol].volume.push(bars[i].v)
            sellBarObj[symbol].epochTime.push(bars[i].t)

            let testing[symbol] = {
                o: open,
                h: high,
                l: low,
                c: close,
                v: volume,
                t: epochTime
            } = {
                bars[i]
            }

        }
    }



    console.log(sellBarObj)

    let newObj = {}
    for (const symbol in toSellBarsData) {
        let bars = toSellBarsData[symbol]
        newObj[symbol] = {
            open: [],
            high: [],
            low: [],
            close: [],
            volume: [],
            epochTime: []
        }
        for (let i = 0; i < bars.length; i++) {
            newObj[symbol].open.push(bars[i].o)
            newObj[symbol].high.push(bars[i].h)
            newObj[symbol].low.push(bars[i].l)
            newObj[symbol].close.push(bars[i].c)
            newObj[symbol].volume.push(bars[i].v)
            newObj[symbol].epochTime.push(bars[i].t)
        }
    }


    console.log(newObj)





}




main()