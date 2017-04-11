# CoinConsole

Customize your very own coinmarketcap.com dashboard with your watched coins.

![Photo of the CoinConsole application](/assets/img/appshot.png)

## Built with node.js

Uses express.js to serve up a page that connects to a websocket port via [socket.io](//socket.io). This express server fetches new data from the public Coin Market Cap API and pushes it to connected clients every set amount of seconds.

### Running it local
Very simple! All you need is node.js >v4.0 (consider using the [n](https://www.npmjs.com/package/n) package to manage your node versions) and a clone of the repo from Github.

After that, you can run the 'node app.js' command (or 'npm start') and visit [localhost:3002](http://localhost:3002) in your favorite web browser. Test away! And don't forget to submit your finished changes as a pull request, if you have any! :) (before you do, please read the contributing.md file in the root directory of this repo).

## Visit the official [CoinConsole](//coinconsole.com) website
