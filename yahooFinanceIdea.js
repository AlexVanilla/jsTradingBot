// I found a network call that will get yahoo finance news.  structure is like this

/*
[{
        "id": "https://blog.tipranks.com/?p=92623",
        "link": "https://blog.tipranks.com/nvidia-nvda-stock-is-a-great-play-says-5-star-analyst/",
        "title": "Nvidia (NVDA) Stock Is a Great Play, Says 5-Star Analyst",
        "shortDescription": "Nvidia (NVDA) has so far weathered the COVID-19 storm quite well. Although its share price dropped along with the majority of the market in March, it has already clawed back most of the coronavirus driven losses. Year-to-date its share price is up by 23%. The performance is not much of a surprise to Tigress Financial’s Ivan Feinseth. In fact, according to the 5-star analyst, Nvidia’s opportunities in “all key secular leading-edge technology demands,” should continue “to drive higher returns on c",
        "published": 1587771177,
        "source": "TipRanks"
    },
    {
        "id"

        ...etc etc
*/

/*
was thinking it might be possible to get this response, loop through it searching for a string with contains()
whatever that has that word in the title or shortDescription, get them in a new array and return the results
might be useful for fundmental analaysis for buy stocks
*/

// get request on this url: https://news-headlines.tradingview.com/headlines/yahoo/?category=stock&locale=en


const https = require('https');

const main = async () => {
    const options = {
        hostname: 'news-headlines.tradingview.com',
        path: '/headlines/yahoo/?category=stock&locale=en',
        method: 'GET'
    }

    let result = await new Promise((resolve, reject) => {
        https.get(options, (res) => {
            let data = '';

            res.on('data', d => data += d);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (err) {
                    reject(err);
                }
            });
        }).on('error', (err) => reject(err));
    })

    console.log(result)
}

main()