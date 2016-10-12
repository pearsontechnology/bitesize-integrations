var path = require('path');
var webpack = require('webpack');
var HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
	entry: {
		pluckyui: ['babel-polyfill', 'whatwg-fetch', './web/js/index.js', 'webpack/hot/dev-server']
	},
	output: {
		path: path.join(__dirname, 'web'),
		filename: '[name]-[hash].js',
		libraryTarget: 'umd',
		publicPath: '/'
	},
	plugins: [
		new HtmlWebpackPlugin({
			title: 'Plucky',
			template: './web/template/index.html'
		}),
		new webpack.HotModuleReplacementPlugin(),
		new webpack.DefinePlugin({
			'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'default')
		}),
	],
	module: {
		loaders: [{
			test: /\.js$/,
			exclude: /node_modules/,
			loader: 'babel',
			query: {
				presets: ['es2015', 'react']
			}
		}, {
			test: /\.scss$/,
			loaders: ['style', 'css', 'sass'] // sass -> css -> javascript -> inline style
		}]
	},
	devServer: {
		hot: true,
		historyApiFallback: true,
		proxy: {
		  '/api/**': {
		  	target: 'http://localhost:3000/'
		  }
		},
		devtool: "inline-source-maps"
	}
};
