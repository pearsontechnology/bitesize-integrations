var path = require('path');
var webpackConfig = require('./webpack.config.js');
var WebpackDevServer = require('webpack-dev-server');
var webpack = require('webpack');

const compiler = webpack(webpackConfig);
var app = new WebpackDevServer(compiler, {
	output: {
		path: path.join(__dirname, 'app'),
		filename: '[name]-[hash].js',
		libraryTarget: 'umd'
	},
	hot: true,
	historyApiFallback: true,
	proxy: {
	  '/api/**': {
	  	target: 'http://localhost:3000/'
	  }
	}
});

app.listen(8080, 'localhost', function() {});