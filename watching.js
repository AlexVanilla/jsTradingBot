const alpaca = require('./alpaca.js')

// TODO: These closing prices were obtained 4/23
// TODO: get next weeks closing prices and calculate the percent change



const main = async () => {
// 1 day screen
let day1 = ['MR', 'PFSW', 'NEPH', 'AP', 'PSTL', 'VNET', 'HBIO', 'SFM', 'SMG', 'REGN', 'MN', 'VSTO', 'IWY']
let day1ClosingPrices = {
    AP: 3.77,
    HBIO: 2.87,
    IWY: 92.5,
    MN: 3.05,
    MR: 5.98,
    NEPH: 9.37,
    PFSW: 3.81,
    PSTL: 15.85,
    REGN: 565.955,
    SFM: 21.39,
    SMG: 121.99,
    VNET: 17.11,
    VSTO: 9.41
}

// 1 week screener
let week1 = ['AEYE', 'GFI', 'AU', 'SAND', 'KGC', 'AKTS', 'SMG', 'TW']
let week1ClosingPrices = {
    AEYE: 7.65,
    AKTS: 8.08,
    AU: 26.3,
    GFI: 7.99,
    KGC: 6.87,
    SAND: 7.45,
    SMG: 121.99,
    TW: 52.47
}

// 1 month screener
let month1 = ['KGC', 'GFI', 'LVGO', 'RDY', 'SMG', 'TWST', 'DHT']
let month1ClosingPrices = {
    DHT: 7.94,
    GFI: 7.99,
    KGC: 6.87,
    LVGO: 41.04,
    RDY: 52.77,
    SMG: 121.99,
    TWST: 31.61
}

// S&P 500
let sp500 = ['NEM', 'REGN', 'CLX', 'FTV', 'MKTX', 'AMCR', 'SJM']
let sp500ClosingPrices = {
    AMCR: 8.2,
    CLX: 189.91,
    FTV: 58.58,
    MKTX: 417.22,
    NEM: 62.44,
    REGN: 565.955,
    SJM: 116.81
}

let test = await alpaca.getBars(sp500)

console.log(test)


/*
NOTES:
GFI, KGC, SMG were in week1 and month1 screeners

But SMG is the only stock that is strong buy for day1, week1, and month1 screeners

all these stocks (except in sp500) are considered STRONG BUY in TradingView and rank 1 in Zack Ranks

SMG - 40
KGC - 30
GFI - 30

*/



// to get percent change in stock
// subtract the old price from the new price and divide the difference by the old price.Then, multiply by 100 to get the percent change.  If it's negative, then price went down

// array1.filter(value => array2.includes(value))

// let filtered = day1.filter(value => week1.includes(value))
// let filtered = week1.filter(value => month1.includes(value))

// console.log(filtered)




}

main()