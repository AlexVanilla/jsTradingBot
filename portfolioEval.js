'use strict'

const api = require('./zackCall')
const tv = require('./tradingView')
// import * as tv from 'tradingView'
const Papa = require('papaparse');
const fs = require('fs');
const helpers = require('./helpers')


const main = async () => {

	let portfolio = [
		"MSFT",
		"AMZN",
		"NFLX",
		"LLY",
		"DPZ",
		"INTC",
		"JAKK",
		"MR",
		"KGC",
		"GFI",
		"BBW",
		"CPB",
		"SMG",
		"AEYE"
	]

	let portfolioStatus = [];

	let stock
	for (stock of portfolio) {

		let result = await api.getData(stock).then(res => {

			if (parseInt(res.zacksRank) > 3) {
				console.log("WARNING:  " + res.ticker + " is greater than 3.  Rank: " + res.zacksRank + "/5")
				console.log("Higher the number, more recommended to sell")
			}

			return res;
		}).catch(err => err);


		portfolioStatus.push(result);
	}

	portfolioStatus.sort(helpers.sortStocks)


	let tickers = []
	for (stock of portfolioStatus) {
		tickers.push(stock.exchange + ":" + stock.ticker);
	}

	// getTechnicalAnalysisInfo will return an array
	let day1TA = await tv.getTechnicalAnalaysisInfo(tickers)
	let week1TA = await tv.getTechnicalAnalaysisInfo(tickers, "1W")
	let month1TA = await tv.getTechnicalAnalaysisInfo(tickers, "1M")

	let infos = []

	// NOTE: this loop requires that all the arrays align with their respective stocks.  Refer to helper.sortStocks()
	for (let i = 0; i < portfolioStatus.length; i++) {

		// need to combine the correct TA to correct portfolio stock

		// Grab all the TA info to push into info
		let technicalAnalysis1D = day1TA[i].technicalAnalysis1D
		let technicalAnalysis1W = week1TA[i].technicalAnalysis1W
		let technicalAnalysis1M = month1TA[i].technicalAnalysis1M


		let obj = {
			...technicalAnalysis1D,
			...technicalAnalysis1W,
			...technicalAnalysis1M,
			...portfolioStatus[i]
		}

		// format
		delete obj.d
		delete obj.s

		infos.push(obj)
	}

	let summaryInfo = []
	let info
	for (info of infos) {
		let obj = {
			ticker: info.ticker,
			name: info.name,
			zacksRankText: info.zacksRankText,
			summary1DStatus: info.summary1D.status,
			summary1WStatus: info.summary1W.status,
			summary1MStatus: info.summary1M.status
		}

		summaryInfo.push(obj)
	}

	console.table(summaryInfo)

	// Export to CSV
	// let test1 = Papa.unparse(infos)

	// fs.writeFile('portfolio.csv', test1, err => {
	// 	if (err) {
	// 		console.error(err)
	// 		return
	// 	}
	// })

}

main();